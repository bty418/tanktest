import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000'; // Make sure this matches your server.js port

interface Player {
  id: string;
  x: number;
  y: number;
  angle: number;
  color: string;
}

interface BulletData {
  x: number;
  y: number;
  angle: number;
  shooterId: string;
  id: string; // Unique bullet ID
}

const TankBattlePage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [bullets, setBullets] = useState<Record<string, BulletData>>({});
  const [playerId, setPlayerId] = useState<string | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const playerSpeed = 2;
  const bulletSpeed = 5;
  const tankSize = 30;
  const bulletSize = 5;

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server!', socket.id);
      setPlayerId(socket.id);
    });

    socket.on('currentPlayers', (serverPlayers: Record<string, Player>) => {
      setPlayers(serverPlayers);
    });

    socket.on('newPlayer', (newPlayer: Player) => {
      setPlayers((prevPlayers) => ({ ...prevPlayers, [newPlayer.id]: newPlayer }));
    });

    socket.on('playerDisconnected', (disconnectedPlayerId: string) => {
      setPlayers((prevPlayers) => {
        const updatedPlayers = { ...prevPlayers };
        delete updatedPlayers[disconnectedPlayerId];
        return updatedPlayers;
      });
    });

    socket.on('playerMoved', (movedPlayer: Player) => {
      setPlayers((prevPlayers) => ({
        ...prevPlayers,
        [movedPlayer.id]: movedPlayer,
      }));
    });

    socket.on('bulletFired', (bulletData: BulletData) => {
      console.log('Bullet fired by other player:', bulletData);
      setBullets(prev => ({...prev, [bulletData.id]: bulletData }));
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressed.current[event.key.toLowerCase()] = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current[event.key.toLowerCase()] = false;
      if (event.key === ' ') { // Space bar for shooting
        shoot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      socket.disconnect();
    };
  }, []);

  const shoot = () => {
    if (socketRef.current && playerId && players[playerId]) {
      const player = players[playerId];
      const angleRad = (player.angle - 90) * (Math.PI / 180); // Adjust for canvas rotation (0 deg is right)
      const bulletId = `${playerId}_${Date.now()}`;
      const bulletData: BulletData = {
        x: player.x + (tankSize / 2) * Math.cos(angleRad),
        y: player.y + (tankSize / 2) * Math.sin(angleRad),
        angle: player.angle,
        shooterId: playerId,
        id: bulletId
      };
      socketRef.current.emit('shoot', bulletData);
      setBullets(prev => ({...prev, [bulletId]: bulletData })); // Add to local bullets immediately
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const gameLoop = () => {
      // Player movement logic
      if (playerId && players[playerId] && socketRef.current) {
        const player = { ...players[playerId] }; // Create a mutable copy
        let moved = false;
        let newAngle = player.angle;

        if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
          const rad = (player.angle - 90) * (Math.PI / 180);
          player.y -= playerSpeed * Math.sin(rad);
          player.x -= playerSpeed * Math.cos(rad);
          moved = true;
        }
        if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
          const rad = (player.angle - 90) * (Math.PI / 180);
          player.y += playerSpeed * Math.sin(rad);
          player.x += playerSpeed * Math.cos(rad);
          moved = true;
        }
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
          newAngle = (player.angle - 5 + 360) % 360;
          moved = true;
        }
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
          newAngle = (player.angle + 5) % 360;
          moved = true;
        }
        
        player.angle = newAngle;

        // Boundary checks
        player.x = Math.max(0, Math.min(canvas.width - tankSize, player.x));
        player.y = Math.max(0, Math.min(canvas.height - tankSize, player.y));

        if (moved) {
          setPlayers(prev => ({ ...prev, [playerId]: player }));
          socketRef.current?.emit('playerMovement', { x: player.x, y: player.y, angle: player.angle });
        }
      }

      // Update bullets
      setBullets(prevBullets => {
        const updatedBullets: Record<string, BulletData> = {};
        Object.values(prevBullets).forEach(bullet => {
          const angleRad = (bullet.angle - 90) * (Math.PI / 180);
          bullet.x += bulletSpeed * Math.cos(angleRad);
          bullet.y += bulletSpeed * Math.sin(angleRad);
          if (bullet.x > 0 && bullet.x < canvas.width && bullet.y > 0 && bullet.y < canvas.height) {
            updatedBullets[bullet.id] = bullet;
          }
        });
        return updatedBullets;
      });

      // Drawing
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = 'lightgray'; // Background
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Draw players
      Object.values(players).forEach((player) => {
        context.save();
        context.translate(player.x + tankSize / 2, player.y + tankSize / 2);
        context.rotate(player.angle * (Math.PI / 180));
        context.fillStyle = player.color;
        context.fillRect(-tankSize / 2, -tankSize / 2, tankSize, tankSize);
        // Draw cannon
        context.fillStyle = 'grey';
        context.fillRect(-3, -tankSize / 2 - 10, 6, 10);
        context.restore();
      });

      // Draw bullets
      Object.values(bullets).forEach(bullet => {
        context.fillStyle = 'black';
        context.beginPath();
        context.arc(bullet.x, bullet.y, bulletSize, 0, 2 * Math.PI);
        context.fill();
      });

      requestAnimationFrame(gameLoop);
    };

    gameLoop();
  }, [players, playerId, bullets]); // Rerun effect if players, playerId or bullets change

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Head>
        <title>Tank Battle - Web Version</title>
      </Head>
      <h1>Tank Battle Online</h1>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid black' }}
      />
      {playerId && <p>Your ID: {playerId}</p>}
    </div>
  );
};

export default TankBattlePage;


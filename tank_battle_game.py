import pygame
import sys
import os # Added for path joining
import math # Added for bullet rotation

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
YELLOW = (255, 255, 0)

# Asset paths
ASSET_DIR = "assets"
IMAGE_DIR = os.path.join(ASSET_DIR, "images")

# --- Helper Functions ---
def load_image(filename, colorkey=None):
    """Loads an image, prepares it for play."""
    fullname = os.path.join(IMAGE_DIR, filename)
    try:
        image = pygame.image.load(fullname)
    except pygame.error as message:
        print(f"Cannot load image: {filename}")
        raise SystemExit(message)
    image = image.convert_alpha() # Ensure transparency is handled
    if colorkey is not None:
        if colorkey == -1:
            colorkey = image.get_at((0, 0))
        image.set_colorkey(colorkey, pygame.RLEACCEL)
    return image, image.get_rect()

# --- Bullet Class ---
class Bullet(pygame.sprite.Sprite):
    def __init__(self, pos, direction_vector, angle, speed=400):
        super().__init__()
        self.original_image, self.rect = load_image("bullet.png")
        self.image = pygame.transform.rotate(self.original_image, angle) # Rotate bullet to match tank's direction
        self.rect = self.image.get_rect(center=pos)
        self.speed = speed
        self.direction = direction_vector.normalize() # Ensure it's a unit vector

    def update(self, dt):
        self.rect.move_ip(self.direction * self.speed * dt)
        # Remove bullet if it goes off-screen
        if not pygame.Rect(0,0, SCREEN_WIDTH, SCREEN_HEIGHT).colliderect(self.rect):
            self.kill()

    def draw(self, surface):
        surface.blit(self.image, self.rect)

# --- Tank Class ---
class Tank(pygame.sprite.Sprite):
    def __init__(self, image_file, start_pos, speed=200, player_num=1, all_sprites_group=None, bullets_group=None):
        super().__init__()
        self.original_image, self.rect = load_image(image_file)
        self.image = self.original_image
        self.rect.center = start_pos
        self.speed = speed
        self.player_num = player_num
        self.direction = pygame.math.Vector2(0, -1) # Default facing up
        self.angle = 0 # For rotation (0 is up, 90 left, 180 down, 270 right)
        self.health = 100
        self.shoot_delay = 500 # milliseconds
        self.last_shot_time = 0
        self.all_sprites = all_sprites_group
        self.bullets = bullets_group

    def rotate_to_angle(self, target_angle):
        """Rotates the tank to a specific angle and updates its direction vector."""
        self.angle = target_angle
        self.image = pygame.transform.rotate(self.original_image, self.angle)
        self.rect = self.image.get_rect(center=self.rect.center)
        self.direction = pygame.math.Vector2(0, -1).rotate(-self.angle).normalize()

    def move(self, direction_vector, dt):
        if direction_vector.length_squared() > 0:
            move_vector = direction_vector.normalize() * self.speed * dt
            self.rect.move_ip(move_vector.x, move_vector.y)
            self.rect.clamp_ip(pygame.Rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT))

    def shoot(self):
        current_time = pygame.time.get_ticks()
        if current_time - self.last_shot_time > self.shoot_delay:
            self.last_shot_time = current_time
            # Calculate bullet start position (e.g., from the cannon tip)
            # For simplicity, start from tank center for now, offset by direction
            bullet_start_pos = self.rect.center + self.direction * (self.rect.height / 2) 
            bullet = Bullet(bullet_start_pos, self.direction, self.angle)
            if self.all_sprites is not None and self.bullets is not None:
                self.all_sprites.add(bullet)
                self.bullets.add(bullet)
            print(f"Player {self.player_num} shot! Angle: {self.angle}, Direction: {self.direction}")

    def update(self, dt, keys):
        move_dir = pygame.math.Vector2(0, 0)
        if self.player_num == 1:
            if keys[pygame.K_w]:
                move_dir.y = -1
                if self.angle != 0: self.rotate_to_angle(0)
            elif keys[pygame.K_s]:
                move_dir.y = 1
                if self.angle != 180: self.rotate_to_angle(180)
            elif keys[pygame.K_a]:
                move_dir.x = -1
                if self.angle != 90: self.rotate_to_angle(90)
            elif keys[pygame.K_d]:
                move_dir.x = 1
                if self.angle != 270: self.rotate_to_angle(270)
            
            if keys[pygame.K_SPACE]:
                self.shoot()

        elif self.player_num == 2:
            if keys[pygame.K_UP]:
                move_dir.y = -1
                if self.angle != 0: self.rotate_to_angle(0)
            elif keys[pygame.K_DOWN]:
                move_dir.y = 1
                if self.angle != 180: self.rotate_to_angle(180)
            elif keys[pygame.K_LEFT]:
                move_dir.x = -1
                if self.angle != 90: self.rotate_to_angle(90)
            elif keys[pygame.K_RIGHT]:
                move_dir.x = 1
                if self.angle != 270: self.rotate_to_angle(270)

            if keys[pygame.K_RETURN]: # For player 2 shoot
                self.shoot()
        
        self.move(move_dir, dt)

    def draw(self, surface):
        surface.blit(self.image, self.rect)

# --- Game Class ---
class Game:
    def __init__(self):
        pygame.init()
        pygame.mixer.init() # For sound
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("坦克大战 (Tank Battle)")
        self.clock = pygame.time.Clock()
        self.running = True
        self.game_state = "main_menu" # Possible states: main_menu, playing, game_over, level_complete
        
        self.all_sprites = pygame.sprite.Group()
        self.tanks = pygame.sprite.Group()
        self.bullets = pygame.sprite.Group() # Group for bullets

        try:
            self.player1 = Tank("tank_player1.png", (SCREEN_WIDTH // 4, SCREEN_HEIGHT - 50), player_num=1, all_sprites_group=self.all_sprites, bullets_group=self.bullets)
            self.player2 = Tank("tank_player2.png", (SCREEN_WIDTH * 3 // 4, SCREEN_HEIGHT - 50), player_num=2, all_sprites_group=self.all_sprites, bullets_group=self.bullets)
            self.all_sprites.add(self.player1, self.player2)
            self.tanks.add(self.player1, self.player2)
        except SystemExit as e:
            print(f"Error initializing tanks: {e}")
            self.running = False
        except pygame.error as e:
            print(f"Pygame error during tank initialization (likely missing asset): {e}")
            self.running = False

    def run(self):
        while self.running:
            self.dt = self.clock.tick(FPS) / 1000.0
            self.handle_events()
            self.update()
            self.draw()
        pygame.quit()
        sys.exit()

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            if self.game_state == "main_menu":
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_RETURN:
                        self.game_state = "playing"
                        print("Game state changed to: playing")
            # Shooting is now handled in Tank's update via get_pressed()

    def update(self):
        if self.game_state == "playing":
            keys = pygame.key.get_pressed()
            self.all_sprites.update(self.dt, keys) # Pass dt and keys to all sprites
            # Note: Tank update now handles its own shooting based on keys
            # Bullets are updated via self.all_sprites.update as they are part of it

    def draw(self):
        self.screen.fill(BLACK)
        if self.game_state == "main_menu":
            self.draw_main_menu()
        elif self.game_state == "playing":
            self.all_sprites.draw(self.screen) # This will draw tanks and bullets
        pygame.display.flip()

    def draw_main_menu(self):
        font = pygame.font.Font(None, 74)
        text = font.render("坦克大战", True, WHITE)
        text_rect = text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 50))
        self.screen.blit(text, text_rect)

        font_small = pygame.font.Font(None, 36)
        start_text = font_small.render("按 Enter 开始游戏", True, WHITE)
        start_text_rect = start_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 50))
        self.screen.blit(start_text, start_text_rect)

# --- Main Execution ---
if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    game = Game()
    game.run()


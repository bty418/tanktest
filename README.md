# 坦克大战（Tank Battle）

## 项目简介

本项目是一个基于 Python 和 Pygame 的本地双人坦克大战游戏。支持坦克移动、旋转、射击，包含主菜单和基础游戏循环。

---

## 目录结构

- `tank_battle_game.py`  主程序，包含所有核心类和逻辑
- `assets/`              游戏资源（图片、音效等）
- `game_design_document.md`  架构与设计说明
- `todo.md`              开发任务清单

---

## 快速开始

1. 安装依赖：
   ```bash
   pip install pygame
   ```
2. 运行游戏：
   ```bash
   python tank_battle_game.py
   ```

---

## 控制说明

- **玩家1**：WASD 移动，空格射击
- **玩家2**：方向键移动，回车射击

---

## 主要类与API文档

### load_image(filename, colorkey=None)
> 加载图片资源，返回图片对象和矩形区域。

**参数：**
- `filename` (str): 图片文件名（位于 assets/images/ 下）
- `colorkey` (可选): 透明色处理

**返回：**
- `(image, rect)`

**示例：**
```python
image, rect = load_image('tank_player1.png')
```

---

### class Bullet(pygame.sprite.Sprite)
> 子弹精灵，负责子弹的运动和绘制。

**构造参数：**
- `pos` (tuple): 初始位置 (x, y)
- `direction_vector` (Vector2): 方向向量
- `angle` (float): 旋转角度
- `speed` (float, 默认400): 子弹速度

**主要方法：**
- `update(dt)`: 更新子弹位置
- `draw(surface)`: 绘制子弹

**示例：**
```python
bullet = Bullet((100, 100), pygame.math.Vector2(0, -1), 0)
bullet.update(0.016)
bullet.draw(screen)
```

---

### class Tank(pygame.sprite.Sprite)
> 坦克精灵，支持移动、旋转、射击。

**构造参数：**
- `image_file` (str): 坦克图片文件名
- `start_pos` (tuple): 初始位置 (x, y)
- `speed` (float, 默认200): 移动速度
- `player_num` (int, 默认1): 玩家编号（1或2）
- `all_sprites_group` (Group): 所有精灵组
- `bullets_group` (Group): 子弹精灵组

**主要方法：**
- `rotate_to_angle(target_angle)`: 旋转坦克到指定角度
- `move(direction_vector, dt)`: 按方向移动
- `shoot()`: 发射子弹
- `update(dt, keys)`: 更新状态（含键盘控制）
- `draw(surface)`: 绘制坦克

**示例：**
```python
tank = Tank('tank_player1.png', (100, 100))
tank.rotate_to_angle(90)
tank.move(pygame.math.Vector2(1, 0), 0.016)
tank.shoot()
tank.update(0.016, pygame.key.get_pressed())
tank.draw(screen)
```

---

### class Game
> 游戏主控类，负责主循环、事件处理、状态切换。

**主要方法：**
- `run()`: 启动游戏主循环
- `handle_events()`: 处理事件
- `update()`: 更新所有精灵
- `draw()`: 绘制当前界面
- `draw_main_menu()`: 绘制主菜单

**示例：**
```python
game = Game()
game.run()
```

---

## 资源与扩展

- 图片资源请放在 `assets/images/` 目录下。
- 可根据 `game_design_document.md` 扩展更多功能（如AI、关卡、道具等）。

---

## 贡献与反馈

如有建议或Bug，欢迎提交Issue或PR。
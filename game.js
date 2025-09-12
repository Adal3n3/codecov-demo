// Bug Squasher Tower Defense Game
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'ready'; // ready, playing, paused, gameOver
        this.health = 100;
        this.score = 0;
        this.money = 150;
        this.wave = 1;
        this.selectedTowerType = null;
        this.selectedTower = null;
        
        // Game objects
        this.bugs = [];
        this.towers = [];
        this.projectiles = [];
        this.effects = [];
        
        // Game timing
        this.lastTime = 0;
        this.waveTimer = 0;
        this.waveDelay = 2000; // 2 seconds between bugs
        this.bugsInWave = 5;
        this.bugsSpawned = 0;
        
        // Path for bugs to follow
        this.path = [
            {x: 0, y: 300},
            {x: 150, y: 300},
            {x: 150, y: 150},
            {x: 400, y: 150},
            {x: 400, y: 450},
            {x: 650, y: 450},
            {x: 650, y: 300},
            {x: 800, y: 300}
        ];
        
        // Tower definitions
        this.towerTypes = {
            'unit-test': {
                name: 'Unit Test',
                cost: 50,
                damage: 25,
                range: 80,
                fireRate: 1000,
                color: '#4299e1',
                icon: '🧪',
                description: 'Catches logic bugs early'
            },
            'code-review': {
                name: 'Code Review',
                cost: 75,
                damage: 40,
                range: 100,
                fireRate: 1500,
                color: '#48bb78',
                icon: '👥',
                description: 'Spots human errors'
            },
            'linter': {
                name: 'Linter',
                cost: 40,
                damage: 15,
                range: 60,
                fireRate: 500,
                color: '#ed8936',
                icon: '🔍',
                description: 'Fast syntax checking'
            },
            'memory-guard': {
                name: 'Memory Guard',
                cost: 100,
                damage: 60,
                range: 120,
                fireRate: 2000,
                color: '#9f7aea',
                icon: '🛡️',
                description: 'Prevents memory leaks'
            }
        };
        
        // Bug types
        this.bugTypes = {
            'syntax-bug': {
                name: 'Syntax Bug',
                health: 50,
                speed: 1,
                reward: 10,
                color: '#f56565',
                emoji: '🐛'
            },
            'logic-bug': {
                name: 'Logic Bug',
                health: 75,
                speed: 0.8,
                reward: 15,
                color: '#ed8936',
                emoji: '🪲'
            },
            'memory-leak': {
                name: 'Memory Leak',
                health: 100,
                speed: 0.6,
                reward: 20,
                color: '#9f7aea',
                emoji: '🕷️'
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateUI();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Tower selection
        document.querySelectorAll('.tower-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const towerType = card.dataset.tower;
                this.selectTowerType(towerType);
            });
        });
        
        // Canvas clicks for tower placement
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleCanvasClick(x, y);
        });
        
        // Game controls
        document.getElementById('startWave').addEventListener('click', () => {
            this.startWave();
        });
        
        document.getElementById('pauseGame').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('resetGame').addEventListener('click', () => {
            this.resetGame();
        });
    }
    
    selectTowerType(towerType) {
        if (this.money >= this.towerTypes[towerType].cost) {
            this.selectedTowerType = towerType;
            this.selectedTower = null;
            
            // Update UI
            document.querySelectorAll('.tower-card').forEach(card => {
                card.classList.remove('selected');
            });
            document.querySelector(`[data-tower="${towerType}"]`).classList.add('selected');
            document.getElementById('towerInfo').style.display = 'none';
        }
    }
    
    handleCanvasClick(x, y) {
        if (this.selectedTowerType) {
            this.placeTower(x, y);
        } else {
            this.selectTowerAt(x, y);
        }
    }
    
    placeTower(x, y) {
        const towerType = this.towerTypes[this.selectedTowerType];
        
        // Check if position is valid (not on path, not too close to other towers)
        if (this.isValidTowerPosition(x, y) && this.money >= towerType.cost) {
            const tower = {
                x: x,
                y: y,
                type: this.selectedTowerType,
                ...towerType,
                lastFired: 0,
                level: 1,
                kills: 0
            };
            
            this.towers.push(tower);
            this.money -= towerType.cost;
            this.selectedTowerType = null;
            
            // Clear selection
            document.querySelectorAll('.tower-card').forEach(card => {
                card.classList.remove('selected');
            });
            
            this.updateUI();
        }
    }
    
    selectTowerAt(x, y) {
        const tower = this.towers.find(t => 
            Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2) < 25
        );
        
        if (tower) {
            this.selectedTower = tower;
            this.showTowerInfo(tower);
        } else {
            this.selectedTower = null;
            document.getElementById('towerInfo').style.display = 'none';
        }
    }
    
    showTowerInfo(tower) {
        const info = document.getElementById('towerInfo');
        const details = document.getElementById('towerDetails');
        
        details.innerHTML = `
            <p><strong>${tower.name}</strong> (Level ${tower.level})</p>
            <p>Damage: ${tower.damage}</p>
            <p>Range: ${tower.range}</p>
            <p>Kills: ${tower.kills}</p>
        `;
        
        info.style.display = 'block';
    }
    
    isValidTowerPosition(x, y) {
        // Check if too close to path
        for (let i = 0; i < this.path.length - 1; i++) {
            const dist = this.distanceToLineSegment(x, y, this.path[i], this.path[i + 1]);
            if (dist < 40) return false;
        }
        
        // Check if too close to other towers
        for (const tower of this.towers) {
            const dist = Math.sqrt((tower.x - x) ** 2 + (tower.y - y) ** 2);
            if (dist < 50) return false;
        }
        
        return true;
    }
    
    distanceToLineSegment(px, py, p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return Math.sqrt((px - p1.x) ** 2 + (py - p1.y) ** 2);
        
        const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (py - p1.y) * dy) / (length * length)));
        const projection = { x: p1.x + t * dx, y: p1.y + t * dy };
        
        return Math.sqrt((px - projection.x) ** 2 + (py - projection.y) ** 2);
    }
    
    startWave() {
        if (this.gameState === 'ready') {
            this.gameState = 'playing';
            this.bugsSpawned = 0;
            this.waveTimer = 0;
        }
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
        }
    }
    
    resetGame() {
        this.health = 100;
        this.score = 0;
        this.money = 150;
        this.wave = 1;
        this.bugs = [];
        this.towers = [];
        this.projectiles = [];
        this.effects = [];
        this.gameState = 'ready';
        this.bugsSpawned = 0;
        this.selectedTower = null;
        this.selectedTowerType = null;
        
        document.querySelectorAll('.tower-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.getElementById('towerInfo').style.display = 'none';
        
        this.updateUI();
    }
    
    spawnBug() {
        const bugTypeKeys = Object.keys(this.bugTypes);
        const bugTypeKey = bugTypeKeys[Math.floor(Math.random() * bugTypeKeys.length)];
        const bugType = this.bugTypes[bugTypeKey];
        
        const bug = {
            x: this.path[0].x,
            y: this.path[0].y,
            pathIndex: 0,
            progress: 0,
            ...bugType,
            maxHealth: bugType.health,
            id: Date.now() + Math.random()
        };
        
        this.bugs.push(bug);
        this.bugsSpawned++;
    }
    
    updateBugs(deltaTime) {
        for (let i = this.bugs.length - 1; i >= 0; i--) {
            const bug = this.bugs[i];
            
            // Move bug along path
            if (bug.pathIndex < this.path.length - 1) {
                const current = this.path[bug.pathIndex];
                const next = this.path[bug.pathIndex + 1];
                
                const dx = next.x - current.x;
                const dy = next.y - current.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                bug.progress += (bug.speed * deltaTime) / distance;
                
                if (bug.progress >= 1) {
                    bug.pathIndex++;
                    bug.progress = 0;
                }
                
                if (bug.pathIndex < this.path.length - 1) {
                    const currentPoint = this.path[bug.pathIndex];
                    const nextPoint = this.path[bug.pathIndex + 1];
                    
                    bug.x = currentPoint.x + (nextPoint.x - currentPoint.x) * bug.progress;
                    bug.y = currentPoint.y + (nextPoint.y - currentPoint.y) * bug.progress;
                }
            } else {
                // Bug reached the end
                this.health -= 10;
                this.bugs.splice(i, 1);
                
                if (this.health <= 0) {
                    this.gameState = 'gameOver';
                }
            }
            
            // Remove dead bugs
            if (bug.health <= 0) {
                this.score += bug.reward;
                this.money += bug.reward;
                this.bugs.splice(i, 1);
                
                // Add explosion effect
                this.addEffect(bug.x, bug.y, '💥', '#ff6b6b');
            }
        }
    }
    
    updateTowers(deltaTime) {
        for (const tower of this.towers) {
            tower.lastFired += deltaTime;
            
            if (tower.lastFired >= tower.fireRate) {
                const target = this.findClosestBug(tower);
                if (target) {
                    this.fireTower(tower, target);
                    tower.lastFired = 0;
                }
            }
        }
    }
    
    findClosestBug(tower) {
        let closest = null;
        let closestDistance = tower.range;
        
        for (const bug of this.bugs) {
            const distance = Math.sqrt((bug.x - tower.x) ** 2 + (bug.y - tower.y) ** 2);
            if (distance <= closestDistance) {
                closest = bug;
                closestDistance = distance;
            }
        }
        
        return closest;
    }
    
    fireTower(tower, target) {
        const projectile = {
            x: tower.x,
            y: tower.y,
            targetX: target.x,
            targetY: target.y,
            target: target,
            damage: tower.damage,
            speed: 300,
            color: tower.color
        };
        
        this.projectiles.push(projectile);
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 5) {
                // Hit target
                if (projectile.target.health > 0) {
                    projectile.target.health -= projectile.damage;
                    this.addEffect(projectile.x, projectile.y, '-' + projectile.damage, '#e53e3e');
                }
                this.projectiles.splice(i, 1);
            } else {
                // Move projectile
                projectile.x += (dx / distance) * projectile.speed * deltaTime / 1000;
                projectile.y += (dy / distance) * projectile.speed * deltaTime / 1000;
            }
        }
    }
    
    updateEffects(deltaTime) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.life -= deltaTime;
            
            if (effect.life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }
    
    addEffect(x, y, text, color) {
        this.effects.push({
            x: x,
            y: y,
            text: text,
            color: color,
            life: 1000
        });
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Spawn bugs
        if (this.bugsSpawned < this.bugsInWave) {
            this.waveTimer += deltaTime;
            if (this.waveTimer >= this.waveDelay) {
                this.spawnBug();
                this.waveTimer = 0;
            }
        }
        
        // Check if wave is complete
        if (this.bugsSpawned >= this.bugsInWave && this.bugs.length === 0) {
            this.wave++;
            this.bugsInWave += 2;
            this.gameState = 'ready';
            this.money += 50; // Bonus for completing wave
        }
        
        this.updateBugs(deltaTime);
        this.updateTowers(deltaTime);
        this.updateProjectiles(deltaTime);
        this.updateEffects(deltaTime);
        
        this.updateUI();
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#f7fafc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw path
        this.drawPath();
        
        // Draw tower ranges (if tower selected)
        if (this.selectedTower) {
            this.drawTowerRange(this.selectedTower);
        }
        
        // Draw placement preview
        if (this.selectedTowerType) {
            this.drawPlacementPreview();
        }
        
        // Draw towers
        this.drawTowers();
        
        // Draw bugs
        this.drawBugs();
        
        // Draw projectiles
        this.drawProjectiles();
        
        // Draw effects
        this.drawEffects();
        
        // Draw game state messages
        this.drawGameStateMessage();
    }
    
    drawPath() {
        this.ctx.strokeStyle = '#cbd5e0';
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        this.ctx.stroke();
        
        // Draw path direction arrows
        this.ctx.fillStyle = '#a0aec0';
        this.ctx.font = '20px Arial';
        for (let i = 0; i < this.path.length - 1; i++) {
            const current = this.path[i];
            const next = this.path[i + 1];
            const midX = (current.x + next.x) / 2;
            const midY = (current.y + next.y) / 2;
            
            this.ctx.fillText('→', midX - 10, midY + 7);
        }
    }
    
    drawTowers() {
        for (const tower of this.towers) {
            // Tower base
            this.ctx.fillStyle = tower.color;
            this.ctx.beginPath();
            this.ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Tower icon
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(tower.icon, tower.x, tower.y + 8);
            
            // Selection indicator
            if (tower === this.selectedTower) {
                this.ctx.strokeStyle = '#48bb78';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(tower.x, tower.y, 25, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
    }
    
    drawTowerRange(tower) {
        this.ctx.strokeStyle = 'rgba(72, 187, 120, 0.3)';
        this.ctx.fillStyle = 'rgba(72, 187, 120, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawPlacementPreview() {
        // Get mouse position (simplified - using canvas center for demo)
        const mouseX = this.canvas.width / 2;
        const mouseY = this.canvas.height / 2;
        
        const towerType = this.towerTypes[this.selectedTowerType];
        const isValid = this.isValidTowerPosition(mouseX, mouseY);
        
        // Range preview
        this.ctx.strokeStyle = isValid ? 'rgba(66, 153, 225, 0.5)' : 'rgba(245, 101, 101, 0.5)';
        this.ctx.fillStyle = isValid ? 'rgba(66, 153, 225, 0.1)' : 'rgba(245, 101, 101, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(mouseX, mouseY, towerType.range, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Tower preview
        this.ctx.fillStyle = isValid ? towerType.color : '#f56565';
        this.ctx.globalAlpha = 0.7;
        this.ctx.beginPath();
        this.ctx.arc(mouseX, mouseY, 20, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(towerType.icon, mouseX, mouseY + 8);
    }
    
    drawBugs() {
        for (const bug of this.bugs) {
            // Bug body
            this.ctx.fillStyle = bug.color;
            this.ctx.beginPath();
            this.ctx.arc(bug.x, bug.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Bug emoji
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(bug.emoji, bug.x, bug.y + 6);
            
            // Health bar
            const barWidth = 30;
            const barHeight = 4;
            const healthPercent = bug.health / bug.maxHealth;
            
            this.ctx.fillStyle = '#e2e8f0';
            this.ctx.fillRect(bug.x - barWidth/2, bug.y - 25, barWidth, barHeight);
            
            this.ctx.fillStyle = healthPercent > 0.5 ? '#48bb78' : healthPercent > 0.25 ? '#ed8936' : '#f56565';
            this.ctx.fillRect(bug.x - barWidth/2, bug.y - 25, barWidth * healthPercent, barHeight);
        }
    }
    
    drawProjectiles() {
        for (const projectile of this.projectiles) {
            this.ctx.fillStyle = projectile.color;
            this.ctx.beginPath();
            this.ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawEffects() {
        for (const effect of this.effects) {
            const alpha = effect.life / 1000;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = effect.color;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(effect.text, effect.x, effect.y - (1000 - effect.life) * 0.05);
            this.ctx.globalAlpha = 1;
        }
    }
    
    drawGameStateMessage() {
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#4a5568';
        
        if (this.gameState === 'ready') {
            this.ctx.fillText('Click "Start Wave" to begin!', this.canvas.width / 2, this.canvas.height / 2);
        } else if (this.gameState === 'paused') {
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        } else if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = '#f56565';
            this.ctx.fillText('GAME OVER!', this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        }
    }
    
    updateUI() {
        document.getElementById('health').textContent = this.health;
        document.getElementById('score').textContent = this.score;
        document.getElementById('money').textContent = this.money;
        document.getElementById('wave').textContent = this.wave;
        
        // Update tower card availability
        document.querySelectorAll('.tower-card').forEach(card => {
            const towerType = card.dataset.tower;
            const cost = this.towerTypes[towerType].cost;
            
            if (this.money < cost) {
                card.classList.add('disabled');
            } else {
                card.classList.remove('disabled');
            }
        });
    }
    
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
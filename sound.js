// Ses Efektleri Sistemi
class SoundSystem {
    constructor() {
        this.enabled = true;
        this.volume = 0.3;
        this.audioContext = null;
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API desteklenmiyor:', e);
            this.enabled = false;
        }
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    setVolume(vol) {
        this.volume = clamp(vol, 0, 1);
    }
    
    play(effectName) {
        if (!this.enabled || !this.initialized) return;
        if (!this.audioContext) this.init();
        if (!this.audioContext) return;
        
        const effect = SOUND_CONFIG.effects[effectName];
        if (!effect) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = effect.type || 'sine';
            oscillator.frequency.setValueAtTime(effect.frequency, this.audioContext.currentTime);
            
            // Frekans düşüşü (daha doğal ses)
            if (effectName === 'explosion') {
                oscillator.frequency.exponentialRampToValueAtTime(
                    40, 
                    this.audioContext.currentTime + effect.duration
                );
            } else if (effectName === 'shoot') {
                oscillator.frequency.exponentialRampToValueAtTime(
                    200, 
                    this.audioContext.currentTime + effect.duration
                );
            }
            
            gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01, 
                this.audioContext.currentTime + effect.duration
            );
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + effect.duration);
        } catch (e) {
            // Sessizce hata yakala
        }
    }
    
    playShoot() {
        this.play('shoot');
    }
    
    playExplosion() {
        this.play('explosion');
    }
    
    playHit() {
        this.play('hit');
    }
    
    playBuild() {
        this.play('build');
    }
    
    playUpgrade() {
        this.play('upgrade');
    }
    
    // Özel ses - uyarı/alarm
    playAlert() {
        if (!this.enabled || !this.initialized) return;
        if (!this.audioContext) this.init();
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(this.volume * 0.5, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        } catch (e) {
            // Sessizce hata yakala
        }
    }
    
    // Satın alma sesi
    playPurchase() {
        if (!this.enabled || !this.initialized) return;
        if (!this.audioContext) this.init();
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(this.volume * 0.4, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        } catch (e) {
            // Sessizce hata yakala
        }
    }
}

window.SoundSystem = SoundSystem;

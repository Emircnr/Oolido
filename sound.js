// Sound Manager - handles game audio
const SoundManager = {
    enabled: true,
    volume: 0.3,
    audioContext: null,
    initialized: false,
    
    init: function() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    },
    
    toggle: function() {
        this.enabled = !this.enabled;
        return this.enabled;
    },
    
    setVolume: function(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    },
    
    play: function(effectName) {
        if (!this.enabled) return;
        if (!this.initialized) this.init();
        if (!this.audioContext) return;
        
        var self = this;
        var effects = {
            shoot: { frequency: 800, duration: 0.1, type: 'square', endFreq: 200 },
            explosion: { frequency: 100, duration: 0.3, type: 'sawtooth', endFreq: 40 },
            hit: { frequency: 300, duration: 0.05, type: 'triangle', endFreq: 150 },
            build: { frequency: 500, duration: 0.2, type: 'sine', endFreq: 700 },
            upgrade: { frequency: 400, duration: 0.3, type: 'sine', endFreq: 800 }
        };
        
        var effect = effects[effectName];
        if (!effect) return;
        
        try {
            var oscillator = this.audioContext.createOscillator();
            var gainNode = this.audioContext.createGain();
            
            oscillator.type = effect.type || 'sine';
            oscillator.frequency.setValueAtTime(effect.frequency, this.audioContext.currentTime);
            
            if (effect.endFreq) {
                oscillator.frequency.exponentialRampToValueAtTime(
                    effect.endFreq, 
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
            // Silently ignore errors
        }
    }
};

window.SoundManager = SoundManager;

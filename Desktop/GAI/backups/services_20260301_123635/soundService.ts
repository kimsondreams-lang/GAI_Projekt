
type SoundType = 'click' | 'hover' | 'error' | 'success' | 'startup';
type SoundProfile = {
    wave: OscillatorType;
    f0: number;
    f1?: number;
    duration: number;
    g0: number;
    g1?: number;
    gPeak?: number;
    peakTime?: number;
    freqRamp?: 'linear' | 'exp';
    gainRamp?: 'linear' | 'exp';
};

const themeProfiles: Record<string, Record<SoundType, SoundProfile>> = {
    neu: {
        click: { wave: 'sine', f0: 520, f1: 260, duration: 0.12, g0: 0.08, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 420, f1: 320, duration: 0.06, g0: 0.02, g1: 0, gainRamp: 'linear' },
        success: { wave: 'triangle', f0: 440, f1: 980, duration: 0.3, g0: 0.08, g1: 0, gainRamp: 'linear' },
        error: { wave: 'sawtooth', f0: 170, f1: 120, duration: 0.25, g0: 0.1, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 180, f1: 760, duration: 1.4, g0: 0, g1: 0, gPeak: 0.18, peakTime: 0.25, freqRamp: 'exp' }
    },
    glass: {
        click: { wave: 'triangle', f0: 640, f1: 360, duration: 0.1, g0: 0.07, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 520, f1: 420, duration: 0.05, g0: 0.018, g1: 0, gainRamp: 'linear' },
        success: { wave: 'sine', f0: 520, f1: 1040, duration: 0.28, g0: 0.07, g1: 0, gainRamp: 'linear' },
        error: { wave: 'square', f0: 180, f1: 120, duration: 0.22, g0: 0.08, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'triangle', f0: 220, f1: 980, duration: 1.3, g0: 0, g1: 0, gPeak: 0.16, peakTime: 0.22, freqRamp: 'exp' }
    },
    classic: {
        click: { wave: 'square', f0: 460, f1: 300, duration: 0.11, g0: 0.06, g1: 0.01, freqRamp: 'linear', gainRamp: 'exp' },
        hover: { wave: 'triangle', f0: 360, f1: 280, duration: 0.06, g0: 0.02, g1: 0, gainRamp: 'linear' },
        success: { wave: 'triangle', f0: 392, f1: 784, duration: 0.32, g0: 0.08, g1: 0, gainRamp: 'linear' },
        error: { wave: 'sawtooth', f0: 160, f1: 90, duration: 0.24, g0: 0.09, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 196, f1: 784, duration: 1.5, g0: 0, g1: 0, gPeak: 0.2, peakTime: 0.3, freqRamp: 'exp' }
    },
    windows10: {
        click: { wave: 'sine', f0: 740, f1: 520, duration: 0.08, g0: 0.06, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 600, f1: 520, duration: 0.05, g0: 0.015, g1: 0, gainRamp: 'linear' },
        success: { wave: 'sine', f0: 660, f1: 1320, duration: 0.26, g0: 0.07, g1: 0, gainRamp: 'linear' },
        error: { wave: 'square', f0: 200, f1: 140, duration: 0.2, g0: 0.08, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'triangle', f0: 220, f1: 880, duration: 1.2, g0: 0, g1: 0, gPeak: 0.17, peakTime: 0.22, freqRamp: 'exp' }
    },
    aurora: {
        click: { wave: 'triangle', f0: 580, f1: 320, duration: 0.12, g0: 0.07, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 480, f1: 360, duration: 0.07, g0: 0.02, g1: 0, gainRamp: 'linear' },
        success: { wave: 'triangle', f0: 520, f1: 1040, duration: 0.34, g0: 0.08, g1: 0, gainRamp: 'linear' },
        error: { wave: 'sawtooth', f0: 150, f1: 90, duration: 0.26, g0: 0.1, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 160, f1: 720, duration: 1.6, g0: 0, g1: 0, gPeak: 0.2, peakTime: 0.3, freqRamp: 'exp' }
    },
    frost: {
        click: { wave: 'triangle', f0: 620, f1: 340, duration: 0.11, g0: 0.07, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 520, f1: 420, duration: 0.06, g0: 0.018, g1: 0, gainRamp: 'linear' },
        success: { wave: 'sine', f0: 540, f1: 1080, duration: 0.3, g0: 0.07, g1: 0, gainRamp: 'linear' },
        error: { wave: 'square', f0: 180, f1: 120, duration: 0.22, g0: 0.08, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'triangle', f0: 200, f1: 900, duration: 1.3, g0: 0, g1: 0, gPeak: 0.16, peakTime: 0.23, freqRamp: 'exp' }
    },
    oceanic: {
        click: { wave: 'sine', f0: 560, f1: 320, duration: 0.12, g0: 0.07, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 460, f1: 360, duration: 0.07, g0: 0.02, g1: 0, gainRamp: 'linear' },
        success: { wave: 'triangle', f0: 500, f1: 1000, duration: 0.32, g0: 0.08, g1: 0, gainRamp: 'linear' },
        error: { wave: 'sawtooth', f0: 160, f1: 110, duration: 0.24, g0: 0.1, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 170, f1: 760, duration: 1.5, g0: 0, g1: 0, gPeak: 0.18, peakTime: 0.28, freqRamp: 'exp' }
    },
    glacier: {
        click: { wave: 'triangle', f0: 500, f1: 280, duration: 0.11, g0: 0.06, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 380, f1: 320, duration: 0.06, g0: 0.016, g1: 0, gainRamp: 'linear' },
        success: { wave: 'sine', f0: 420, f1: 880, duration: 0.28, g0: 0.06, g1: 0, gainRamp: 'linear' },
        error: { wave: 'triangle', f0: 160, f1: 110, duration: 0.22, g0: 0.06, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 180, f1: 700, duration: 1.2, g0: 0, g1: 0, gPeak: 0.14, peakTime: 0.22, freqRamp: 'exp' }
    }
};

const styleProfiles: Record<string, Record<SoundType, SoundProfile>> = {
    balanced: {
        click: { wave: 'sine', f0: 540, f1: 320, duration: 0.1, g0: 0.07, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 420, f1: 360, duration: 0.06, g0: 0.02, g1: 0, gainRamp: 'linear' },
        success: { wave: 'triangle', f0: 460, f1: 980, duration: 0.28, g0: 0.07, g1: 0, gainRamp: 'linear' },
        error: { wave: 'square', f0: 170, f1: 120, duration: 0.22, g0: 0.08, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 180, f1: 760, duration: 1.3, g0: 0, g1: 0, gPeak: 0.16, peakTime: 0.24, freqRamp: 'exp' }
    },
    soft: {
        click: { wave: 'triangle', f0: 500, f1: 280, duration: 0.12, g0: 0.06, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 380, f1: 320, duration: 0.07, g0: 0.018, g1: 0, gainRamp: 'linear' },
        success: { wave: 'sine', f0: 420, f1: 880, duration: 0.3, g0: 0.06, g1: 0, gainRamp: 'linear' },
        error: { wave: 'triangle', f0: 140, f1: 100, duration: 0.22, g0: 0.07, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 160, f1: 700, duration: 1.4, g0: 0, g1: 0, gPeak: 0.15, peakTime: 0.25, freqRamp: 'exp' }
    },
    crisp: {
        click: { wave: 'square', f0: 640, f1: 360, duration: 0.1, g0: 0.08, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'triangle', f0: 520, f1: 440, duration: 0.05, g0: 0.02, g1: 0, gainRamp: 'linear' },
        success: { wave: 'square', f0: 540, f1: 1120, duration: 0.26, g0: 0.08, g1: 0, gainRamp: 'linear' },
        error: { wave: 'square', f0: 200, f1: 140, duration: 0.2, g0: 0.09, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'triangle', f0: 220, f1: 900, duration: 1.2, g0: 0, g1: 0, gPeak: 0.18, peakTime: 0.22, freqRamp: 'exp' }
    },
    retro: {
        click: { wave: 'square', f0: 460, f1: 300, duration: 0.11, g0: 0.07, g1: 0.01, freqRamp: 'linear', gainRamp: 'exp' },
        hover: { wave: 'triangle', f0: 360, f1: 280, duration: 0.06, g0: 0.02, g1: 0, gainRamp: 'linear' },
        success: { wave: 'triangle', f0: 392, f1: 784, duration: 0.32, g0: 0.08, g1: 0, gainRamp: 'linear' },
        error: { wave: 'sawtooth', f0: 160, f1: 90, duration: 0.24, g0: 0.1, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 196, f1: 784, duration: 1.5, g0: 0, g1: 0, gPeak: 0.22, peakTime: 0.3, freqRamp: 'exp' }
    },
    ambient: {
        click: { wave: 'sine', f0: 420, f1: 240, duration: 0.16, g0: 0.05, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 300, f1: 240, duration: 0.1, g0: 0.015, g1: 0, gainRamp: 'linear' },
        success: { wave: 'triangle', f0: 360, f1: 720, duration: 0.38, g0: 0.06, g1: 0, gainRamp: 'linear' },
        error: { wave: 'triangle', f0: 120, f1: 90, duration: 0.28, g0: 0.06, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 140, f1: 600, duration: 1.8, g0: 0, g1: 0, gPeak: 0.14, peakTime: 0.35, freqRamp: 'exp' }
    },
    cinematic: {
        click: { wave: 'triangle', f0: 560, f1: 300, duration: 0.12, g0: 0.08, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 440, f1: 360, duration: 0.06, g0: 0.02, g1: 0, gainRamp: 'linear' },
        success: { wave: 'sine', f0: 520, f1: 1040, duration: 0.4, g0: 0.09, g1: 0, gainRamp: 'linear' },
        error: { wave: 'sawtooth', f0: 140, f1: 100, duration: 0.3, g0: 0.1, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 180, f1: 900, duration: 2.0, g0: 0, g1: 0, gPeak: 0.2, peakTime: 0.4, freqRamp: 'exp' }
    },
    minimal: {
        click: { wave: 'sine', f0: 520, f1: 380, duration: 0.08, g0: 0.05, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'sine', f0: 360, f1: 320, duration: 0.05, g0: 0.012, g1: 0, gainRamp: 'linear' },
        success: { wave: 'sine', f0: 440, f1: 660, duration: 0.22, g0: 0.05, g1: 0, gainRamp: 'linear' },
        error: { wave: 'sine', f0: 180, f1: 140, duration: 0.18, g0: 0.06, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 200, f1: 500, duration: 0.9, g0: 0, g1: 0, gPeak: 0.1, peakTime: 0.2, freqRamp: 'exp' }
    },
    chime: {
        click: { wave: 'triangle', f0: 880, f1: 520, duration: 0.1, g0: 0.07, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'triangle', f0: 660, f1: 520, duration: 0.06, g0: 0.02, g1: 0, gainRamp: 'linear' },
        success: { wave: 'triangle', f0: 880, f1: 1320, duration: 0.3, g0: 0.08, g1: 0, gainRamp: 'linear' },
        error: { wave: 'square', f0: 220, f1: 160, duration: 0.2, g0: 0.08, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'triangle', f0: 330, f1: 1320, duration: 1.2, g0: 0, g1: 0, gPeak: 0.18, peakTime: 0.22, freqRamp: 'exp' }
    },
    tech: {
        click: { wave: 'square', f0: 720, f1: 420, duration: 0.09, g0: 0.08, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'square', f0: 520, f1: 420, duration: 0.05, g0: 0.018, g1: 0, gainRamp: 'linear' },
        success: { wave: 'square', f0: 600, f1: 1200, duration: 0.24, g0: 0.08, g1: 0, gainRamp: 'linear' },
        error: { wave: 'square', f0: 210, f1: 140, duration: 0.2, g0: 0.1, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'square', f0: 260, f1: 980, duration: 1.1, g0: 0, g1: 0, gPeak: 0.16, peakTime: 0.2, freqRamp: 'exp' }
    },
    organic: {
        click: { wave: 'sine', f0: 520, f1: 260, duration: 0.13, g0: 0.06, g1: 0.01, freqRamp: 'exp', gainRamp: 'exp' },
        hover: { wave: 'triangle', f0: 360, f1: 300, duration: 0.07, g0: 0.018, g1: 0, gainRamp: 'linear' },
        success: { wave: 'triangle', f0: 400, f1: 900, duration: 0.36, g0: 0.07, g1: 0, gainRamp: 'linear' },
        error: { wave: 'sine', f0: 160, f1: 110, duration: 0.24, g0: 0.07, g1: 0, gainRamp: 'linear' },
        startup: { wave: 'sine', f0: 180, f1: 760, duration: 1.6, g0: 0, g1: 0, gPeak: 0.18, peakTime: 0.3, freqRamp: 'exp' }
    }
};

class SoundService {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private enabled: boolean = true;
    private volume: number = 0.6;
    private theme: string = 'neu';
    private style: string = 'soft';

    constructor() {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioCtx();
        } catch (e) {
            console.warn("AudioContext not supported");
        }
    }

    private init() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (!this.master) {
            this.master = this.ctx.createGain();
            this.master.connect(this.ctx.destination);
        }
        this.master.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }

    setTheme(theme: string) {
        this.theme = themeProfiles[theme] ? theme : 'neu';
    }
    setStyle(style: string) {
        this.style = styleProfiles[style] ? style : 'soft';
    }

    setVolume(volume: number) {
        const next = Math.max(0, Math.min(1, Number(volume)));
        this.volume = Number.isFinite(next) ? next : this.volume;
        if (this.ctx && this.master) {
            this.master.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
        return this.volume;
    }

    getVolume() {
        return this.volume;
    }

    setEnabled(enabled: boolean, silent?: boolean) {
        this.enabled = !!enabled;
        if (this.enabled && !silent) this.play('success');
        return this.enabled;
    }

    toggle() {
        return this.setEnabled(!this.enabled);
    }

    isEnabled() {
        return this.enabled;
    }

    private profile(type: SoundType): SoundProfile {
        const styleSet = styleProfiles[this.style];
        if (styleSet) return styleSet[type];
        const set = themeProfiles[this.theme] || themeProfiles.neu;
        return set[type];
    }

    play(type: SoundType) {
        if (!this.enabled || !this.ctx) return;
        this.init();
        if (!this.master) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.master);

        const now = this.ctx.currentTime;
        const p = this.profile(type);

        osc.type = p.wave;
        osc.frequency.setValueAtTime(p.f0, now);
        if (typeof p.f1 === 'number') {
            if (p.freqRamp === 'exp') {
                osc.frequency.exponentialRampToValueAtTime(p.f1, now + p.duration);
            } else {
                osc.frequency.linearRampToValueAtTime(p.f1, now + p.duration);
            }
        }

        gain.gain.setValueAtTime(p.g0, now);
        if (typeof p.gPeak === 'number' && typeof p.peakTime === 'number') {
            gain.gain.linearRampToValueAtTime(p.gPeak, now + p.peakTime);
            gain.gain.linearRampToValueAtTime(p.g1 ?? 0, now + p.duration);
        } else if (typeof p.g1 === 'number') {
            if (p.gainRamp === 'exp' && p.g1 > 0) {
                gain.gain.exponentialRampToValueAtTime(p.g1, now + p.duration);
            } else {
                gain.gain.linearRampToValueAtTime(p.g1, now + p.duration);
            }
        } else {
            gain.gain.linearRampToValueAtTime(0, now + p.duration);
        }

        osc.start(now);
        osc.stop(now + p.duration);
    }
}

export const soundService = new SoundService();

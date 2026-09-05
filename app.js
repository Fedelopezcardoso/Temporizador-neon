/**
 * Neon Violet Timer Web Application
 * Handles high-precision countdown timers, audio synthesizer alerts, 
 * SVG circular neon progress rings, and customizable labels up to 64 chars.
 */

class TimerManager {
    constructor() {
        this.timers = [];
        this.soundEnabled = true;
        this.audioCtx = null;
        this.activeAlarmTimerId = null;

        this.initDOM();
        this.initEvents();
        // Create initial default timer inspired by Google's UI
        this.addTimer("Temporizador · Escribe el tiempo", 0, 10, 38);
    }

    initDOM() {
        this.timersList = document.getElementById('timersList');
        this.addTimerBtn = document.getElementById('addTimerBtn');
        this.soundToggleBtn = document.getElementById('soundToggleBtn');
        this.alarmOverlay = document.getElementById('alarmOverlay');
        this.alarmTitle = document.getElementById('alarmTitle');
        this.alarmLabel = document.getElementById('alarmLabel');
        this.dismissAlarmBtn = document.getElementById('dismissAlarmBtn');
        this.presetBtns = document.querySelectorAll('.preset-btn');
    }

    initEvents() {
        this.addTimerBtn.addEventListener('click', () => {
            this.addTimer("Nuevo Temporizador", 0, 5, 0);
        });

        this.soundToggleBtn.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.soundToggleBtn.querySelector('.btn-icon').textContent = this.soundEnabled ? '🔊' : '🔇';
            this.soundToggleBtn.title = this.soundEnabled ? 'Sonido Activado' : 'Sonido Desactivado';
        });

        this.dismissAlarmBtn.addEventListener('click', () => {
            this.stopAlarm();
        });

        this.presetBtns.addEventListener ? null : null;
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const addedSeconds = parseInt(btn.dataset.time, 10);
                this.applyPresetToActiveTimer(addedSeconds);
            });
        });
    }

    // Web Audio Synthesizer for Alarm
    initAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playAlarmSound() {
        if (!this.soundEnabled) return;
        this.initAudioContext();

        // Synth chime loop
        const playTone = (freq, duration, delay) => {
            setTimeout(() => {
                if (!this.audioCtx) return;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.value = freq;

                gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start();
                osc.stop(this.audioCtx.currentTime + duration);
            }, delay);
        };

        // Play harmonic chime
        this.alarmInterval = setInterval(() => {
            playTone(880, 0.4, 0);    // A5
            playTone(1108.73, 0.4, 150); // C#6
            playTone(1318.51, 0.6, 300); // E6
        }, 1000);
    }

    stopAlarm() {
        if (this.alarmInterval) {
            clearInterval(this.alarmInterval);
            this.alarmInterval = null;
        }
        this.alarmOverlay.classList.add('hidden');
    }

    triggerAlarm(timer) {
        this.alarmTitle.textContent = "¡TIEMPO FINALIZADO!";
        this.alarmLabel.textContent = timer.label || "Sin etiqueta";
        this.alarmOverlay.classList.remove('hidden');
        this.playAlarmSound();
    }

    applyPresetToActiveTimer(seconds) {
        if (this.timers.length === 0) {
            this.addTimer("Temporizador", 0, 0, seconds);
            return;
        }
        // Apply to first or currently running timer
        const targetTimer = this.timers.find(t => t.isRunning) || this.timers[0];
        targetTimer.addSeconds(seconds);
    }

    addTimer(label, h = 0, m = 10, s = 38) {
        const id = 'timer_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const timerInstance = new SingleTimer(id, label, h, m, s, this);
        this.timers.push(timerInstance);
        this.timersList.appendChild(timerInstance.element);
    }

    removeTimer(id) {
        const index = this.timers.findIndex(t => t.id === id);
        if (index !== -1) {
            this.timers[index].destroy();
            this.timers.splice(index, 1);
        }
    }
}

class SingleTimer {
    constructor(id, label, h, m, s, manager) {
        this.id = id;
        this.label = label.substring(0, 64);
        this.hours = h;
        this.minutes = m;
        this.seconds = s;
        this.totalInitialSeconds = h * 3600 + m * 60 + s;
        this.currentTotalSeconds = this.totalInitialSeconds;
        this.isRunning = false;
        this.intervalId = null;
        this.manager = manager;

        this.element = this.createTimerDOM();
        this.bindEvents();
        this.updateDisplay();
    }

    createTimerDOM() {
        const card = document.createElement('div');
        card.className = 'timer-card';
        card.id = this.id;

        card.innerHTML = `
            <div class="timer-header-row">
                <div class="timer-label-group">
                    <input type="text" class="timer-label-input" maxlength="64" value="${this.escapeHTML(this.label)}" placeholder="Escribe el tiempo o nombre del temporizador..." title="Etiqueta del temporizador (máx. 64 letras)">
                    <span class="char-counter">${this.label.length}/64</span>
                </div>
                <button class="timer-close-btn" title="Eliminar temporizador">✕</button>
            </div>

            <div class="timer-main-row">
                <div class="play-ring-container" title="Iniciar/Pausar">
                    <svg class="progress-ring-svg" viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#d946ef" />
                                <stop offset="50%" stop-color="#b026ff" />
                                <stop offset="100%" stop-color="#7e22ce" />
                            </linearGradient>
                        </defs>
                        <circle class="ring-bg" cx="50" cy="50" r="44"></circle>
                        <circle class="ring-progress" cx="50" cy="50" r="44" stroke-dasharray="276.46" stroke-dashoffset="0"></circle>
                    </svg>
                    <button class="play-action-btn">
                        <span class="play-icon">▶</span>
                    </button>
                </div>

                <div class="digits-container">
                    <div class="time-unit-group">
                        <input type="text" class="digit-field digit-h" value="${this.pad(this.hours)}" maxlength="2" inputmode="numeric">
                        <span class="unit-label">h</span>
                    </div>
                    <div class="time-unit-group">
                        <input type="text" class="digit-field digit-m" value="${this.pad(this.minutes)}" maxlength="2" inputmode="numeric">
                        <span class="unit-label">m</span>
                    </div>
                    <div class="time-unit-group">
                        <input type="text" class="digit-field digit-s" value="${this.pad(this.seconds)}" maxlength="2" inputmode="numeric">
                        <span class="unit-label">s</span>
                    </div>
                </div>
            </div>

            <div class="timer-footer-row">
                <button class="reset-btn">Reiniciar</button>
            </div>
        `;

        return card;
    }

    bindEvents() {
        this.labelInput = this.element.querySelector('.timer-label-input');
        this.charCounter = this.element.querySelector('.char-counter');
        this.closeBtn = this.element.querySelector('.timer-close-btn');
        this.playRingContainer = this.element.querySelector('.play-ring-container');
        this.playBtn = this.element.querySelector('.play-action-btn');
        this.playIcon = this.element.querySelector('.play-icon');
        this.ringProgress = this.element.querySelector('.ring-progress');
        this.resetBtn = this.element.querySelector('.reset-btn');

        this.digitH = this.element.querySelector('.digit-h');
        this.digitM = this.element.querySelector('.digit-m');
        this.digitS = this.element.querySelector('.digit-s');

        // 64-char label handler
        this.labelInput.addEventListener('input', (e) => {
            let val = e.target.value;
            if (val.length > 64) {
                val = val.substring(0, 64);
                e.target.value = val;
            }
            this.label = val;
            this.charCounter.textContent = `${val.length}/64`;
        });

        // Play/Pause click
        this.playRingContainer.addEventListener('click', () => {
            this.togglePlayPause();
        });

        // Close click
        this.closeBtn.addEventListener('click', () => {
            this.manager.removeTimer(this.id);
        });

        // Reset click
        this.resetBtn.addEventListener('click', () => {
            this.reset();
        });

        // Digits manual editing
        [this.digitH, this.digitM, this.digitS].forEach(input => {
            input.addEventListener('focus', () => {
                if (this.isRunning) this.pause();
                input.select();
            });

            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                this.readTimeFromInputs();
            });

            input.addEventListener('blur', () => {
                this.readTimeFromInputs();
                this.updateDisplay();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                    this.start();
                }
            });
        });
    }

    readTimeFromInputs() {
        let h = parseInt(this.digitH.value, 10) || 0;
        let m = parseInt(this.digitM.value, 10) || 0;
        let s = parseInt(this.digitS.value, 10) || 0;

        h = Math.min(Math.max(h, 0), 99);
        m = Math.min(Math.max(m, 0), 59);
        s = Math.min(Math.max(s, 0), 59);

        this.hours = h;
        this.minutes = m;
        this.seconds = s;
        this.currentTotalSeconds = h * 3600 + m * 60 + s;
        this.totalInitialSeconds = this.currentTotalSeconds;
        this.updateProgressRing();
    }

    togglePlayPause() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }

    start() {
        if (this.currentTotalSeconds <= 0) return;
        this.manager.initAudioContext();
        this.isRunning = true;
        this.element.classList.add('running');
        this.playBtn.classList.add('running');
        this.playIcon.textContent = '❚❚';

        this.disableDigitInputs(true);

        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        this.element.classList.remove('running');
        this.playBtn.classList.remove('running');
        this.playIcon.textContent = '▶';
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.disableDigitInputs(false);
    }

    reset() {
        this.pause();
        this.currentTotalSeconds = this.totalInitialSeconds;
        this.updateTimeFromSeconds(this.currentTotalSeconds);
        this.updateDisplay();
    }

    addSeconds(sec) {
        this.currentTotalSeconds += sec;
        this.totalInitialSeconds = Math.max(this.totalInitialSeconds, this.currentTotalSeconds);
        this.updateTimeFromSeconds(this.currentTotalSeconds);
        this.updateDisplay();
    }

    tick() {
        if (this.currentTotalSeconds > 0) {
            this.currentTotalSeconds--;
            this.updateTimeFromSeconds(this.currentTotalSeconds);
            this.updateDisplay();

            if (this.currentTotalSeconds === 0) {
                this.pause();
                this.manager.triggerAlarm(this);
            }
        }
    }

    updateTimeFromSeconds(totalSec) {
        this.hours = Math.floor(totalSec / 3600);
        const remainder = totalSec % 3600;
        this.minutes = Math.floor(remainder / 60);
        this.seconds = remainder % 60;
    }

    updateDisplay() {
        this.digitH.value = this.pad(this.hours);
        this.digitM.value = this.pad(this.minutes);
        this.digitS.value = this.pad(this.seconds);

        this.updateProgressRing();
    }

    updateProgressRing() {
        const circumference = 276.46; // 2 * PI * r (r=44)
        if (this.totalInitialSeconds <= 0) {
            this.ringProgress.style.strokeDashoffset = 0;
            return;
        }
        const fraction = this.currentTotalSeconds / this.totalInitialSeconds;
        const offset = circumference - (fraction * circumference);
        this.ringProgress.style.strokeDashoffset = offset;
    }

    disableDigitInputs(disabled) {
        this.digitH.readOnly = disabled;
        this.digitM.readOnly = disabled;
        this.digitS.readOnly = disabled;
    }

    pad(num) {
        return String(num).padStart(2, '0');
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    destroy() {
        this.pause();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    window.timerManager = new TimerManager();
});

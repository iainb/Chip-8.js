(function () {
    
    function C8 () {
        this.Init();
    }

    window.C8 = C8;

    C8.prototype.Init = function () {
        // initialise memory, registers, stack and screen.
        this._mbuf = new ArrayBuffer(4096);         // chip-8 main memory 4kb
        this.m     = new Uint8Array(this._mbuf);

        this._rbuf = new ArrayBuffer(16)            // registers 0 - 15
        this.r     = new Uint8Array(this._rbuf);    

        this.r_delay = 0; // delay register
        this.r_sound = 0; // sound register

        this._sbuf = new ArrayBuffer(32);           // stack
        this.s     = new Uint16Array(this._sbuf);
        this.sp    = 0;                             // stack pointer
        
        this.pc    = 0x200;                         // program counter
    
        this._screen = new ArrayBuffer(16 * 32);    // setup screen
        this.screen = new Uint8Array(this._screen);

        this.LoadSprites();

        // the rate is the number of instructions to process per frame
        // the framerate is 60Hz
        this.rate = 8;

        // interval timer
        this.interval = null;

        // render is not set
        this.render = null;
    };

    // set the function we use to render the display
    C8.prototype.SetRender = function (render) {
        this.render = render;
    };

    // load text sprites into reserved memory
    C8.prototype.LoadSprites = function () {
        var sprites, i;
        sprites = [
            0xF0, 0x90, 0x90, 0x90, 0xF0, 0x00, 0x00, 0x00,
            0x20, 0x60, 0x20, 0x20, 0x70, 0x00, 0x00, 0x00,
            0xF0, 0x10, 0xF0, 0x80, 0xF0, 0x00, 0x00, 0x00,
            0xF0, 0x10, 0xF0, 0x10, 0xF0, 0x00, 0x00, 0x00,
            0x90, 0x90, 0xF0, 0x10, 0x10, 0x00, 0x00, 0x00,
            0xF0, 0x80, 0xF0, 0x10, 0xF0, 0x00, 0x00, 0x00,
            0xF0, 0x80, 0xF0, 0x90, 0xF0, 0x00, 0x00, 0x00,
            0xF0, 0x10, 0x20, 0x40, 0x40, 0x00, 0x00, 0x00,
            0xF0, 0x90, 0xF0, 0x90, 0xF0, 0x00, 0x00, 0x00,
            0xF0, 0x90, 0xF0, 0x10, 0xF0, 0x00, 0x00, 0x00,
            0xF0, 0x90, 0xF0, 0x90, 0x90, 0x00, 0x00, 0x00,
            0xE0, 0x90, 0xE0, 0x90, 0xE0, 0x00, 0x00, 0x00,
            0xF0, 0x80, 0x80, 0x80, 0xF0, 0x00, 0x00, 0x00,
            0xE0, 0x90, 0x90, 0x90, 0xE0, 0x00, 0x00, 0x00,
            0xF0, 0x80, 0xF0, 0x80, 0xF0, 0x00, 0x00, 0x00,
            0xF0, 0x80, 0xF0, 0x80, 0x80, 0x00, 0x00, 0x00
        ];

        for (i = 0; i < sprites.length; i = i + 1) {
            this.m[i] = sprites[i];
        }
    };

    // load a rom from a url
    C8.prototype.LoadFromUrl = function (url) {
        var req, self;
        self = this;
        req = new XMLHttpRequest();
        req.responseType = "arraybuffer";
        req.open('GET', url, true);
        req.onload = function (e) {
            var data, buf;
            data = this.response;
            buf  = new Uint8Array(data);
            self.LoadResource(buf);
        };  
        req.send(null);  
    };

    // Load a rom into memory and start executing
    C8.prototype.LoadResource = function (rom) {
        var self;

        self = this;

        for (i = 0; i < rom.length; i = i + 1) {
            this.m[i + 0x200] = rom[i];        
        }

        // start the main loop timers run at 60hz
        this.interval = setInterval(function () { self.ServiceTimers() }, 1000 / 60);
    };

    // handle service timers
    C8.prototype.ServiceTimers = function () {
        var i;
        if (this.r_delay !== 0) {
            this.r_delay = this.r_delay - 1;
        }

        if (this.r_sound !== 0) {
            this.r_sounce = this.r_sound - 1;
        }

        // handle this.rate instructions
        for (i = 0; i < this.rate; i = i + 1) {
            try {
                this.HandleInstruction();
            } catch (e1) {
                console.log('error: ' + e1);
                if (this.interval !== null) {
                    clearInterval(this.interval);
                    return;
                }
            }
        }

        this.UpdateDisplay();
    };

    // handle a single instruction, as documented here:
    //
    // http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#3.1
    C8.prototype.HandleInstruction = function () {
        var op, v, nnn, n, x, y, kk;

        // decode instruction
        op  = (this.m[this.pc] << 8) + this.m[this.pc + 1];
        v   = (op & 0xf000) >> 12;
        nnn = (op & 0x0fff);
        n   = (op & 0x000f);
        x   = (op & 0x0f00) >> 8;
        y   = (op & 0x00f0) >> 4;
        kk  = (op & 0x00ff);

        // advance the program counter
        this.pc = this.pc + 2;
        if (op === 0x00e0) {
            // clear screen
            this.ClearScreen(); 
        } else if (op === 0x00ee) {
            // return from subroutine
            throw "Unhandled instruction: 0x00ee";
        } else {
            switch (v) {
                case 0x1:       // Jump, set PC to nnn
                    this.pc = nnn;
                    break;
                case 0x2:       // Call subroutine
                    this.s[this.sp] = this.pc;
                    this.sp = this.sp + 1;
                    this.pc = nnn;    
                    break;
                case 0x3:       // skip instruction if Vx == kk
                    if (this.r[x] === kk) {
                        this.pc = this.pc + 2;
                    }
                    break;
                case 0x6:       // Load byte kk into Vx
                    this.r[x] = kk;
                    break;
                case 0xF:       // 
                    switch (kk) {
                        case 0x07:  // place delay timer in Vx
                            this.r[x] = this.r_delay;
                            break;
                        case 0x15:  // set delay timer
                            this.r_delay = this.r[x];
                            break;
                        default:
                            throw "Unhandled instruction: 0x" + op.toString(16);
                    }
                    break;
                default:
                    throw "Unhandled instruction: 0x" + op.toString(16);
            }
        }
    };

    // clear the screen
    C8.prototype.ClearScreen = function () {
        var i;
        for (i = 0; i < this.screen.length; i = i + 1) {
            this.screen[i] = 0;
        } 

        this.UpdateDisplay();
    };

    // update the display
    C8.prototype.UpdateDisplay = function () {
        if (this.render !== null) {
            this.render.Render(this.screen);
        }
    };

    // Handle n instructions
    C8.prototype.Run = function (n) {
        var i;
        for (i = 0; i < n; i = i + 1) {
            this.HandleInstruction();
        }
    };
}());

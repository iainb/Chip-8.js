define([], function () {
    
    function C8 () {
        this.Init();
    }

    C8.prototype.Init = function () {
        // initialise memory, registers, stack and screen.
        this._mbuf = new ArrayBuffer(4096);         // chip-8 main memory 4kb
        this.m     = new Uint8Array(this._mbuf);

        this._rbuf = new ArrayBuffer(16);            // registers 0 - 15
        this.r     = new Uint8Array(this._rbuf);    

        this.i     = 0;

        this.r_delay = 0; // delay register
        this.r_sound = 0; // sound register

        this._sbuf = new ArrayBuffer(32);           // stack
        this.s     = new Uint16Array(this._sbuf);
        this.sp    = 0;                             // stack pointer
        
        this.pc    = 0x200;                         // program counter

        this.SetupScreen();
        this.LoadSprites();

        // the rate is the number of instructions to process per frame
        // the framerate is 60Hz
        this.rate = 8;

        // interval timer
        this.interval = null;

        // render is not set
        this.render = null;
        this.count = 0;

        this.SetupEventHandlers();
    };

    // event handlers for keys
    C8.prototype.SetupEventHandlers = function () {
        var self;
        this.keystate = {  0x0: false, 0x1: false, 0x2: false, 0x3: false,
                           0x4: false, 0x5: false, 0x6: false, 0x7: false,
                           0x8: false, 0x9: false, 0xa: false, 0xb: false,
                           0xc: false, 0xd: false, 0xe: false, 0xe: false, };

        this.keymap = { 48: 0x0, 49: 0x1, 50: 0x2, 51: 0x3,
                        52: 0x4, 53: 0x5, 54: 0x6, 55: 0x7,
                        56: 0x8, 57: 0x9, 65: 0xa, 66: 0xb,
                        67: 0xc, 68: 0xd, 69: 0xe, 70: 0xf };

        this.waitforkeypress = false;

        // event handlers
        self = this;
        $(window).on('keydown', function (e) {
            if (self.keymap.hasOwnProperty(e.which) === true) {
                self.keystate[self.keymap[e.which]] = true;
    
                // handle wait for keypress
                if (self.waitforkeypress !== false) {
                    self.r[self.waitforkeypress] = self.keymap[e.which];
                    self.waitforkeypress = false;
                    // restart main loop
                    self.interval = setInterval(function () { self.ServiceTimers(); }, 1000 / 60);
                }
            }

        });

        $(window).on('keyup', function(e) {
            if (self.keymap.hasOwnProperty(e.which) === true) {
                self.keystate[self.keymap[e.which]] = false;
            }
        });
    };

    // Setup the data structures for rendering the screen
    C8.prototype.SetupScreen = function () {
        var i;
        this._screen = new ArrayBuffer(64 * 32);    // setup screen
        this.screen  = new Uint8Array(this._screen);

        this._update = new ArrayBuffer(64 * 32);    // setup update buffer only render pixels that change.
        this.update  = new Uint8Array(this._update);    
        for (i = 0; i < this.update.length; i = i + 1) {
            this.update[i] = 1;
        }
        this.updateRequired = true;                 // are we required to redraw the screen

    };

    // set the function we use to render the display
    C8.prototype.SetRender = function (render) {
        this.render = render;
    };

    // load hex character sprites into reserved memory
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
        req.onload = function () {
            var data, buf;
            data = this.response;
            buf  = new Uint8Array(data);
            self.LoadResource(buf);
        };  
        req.send(null);  
    };

    // Load a rom into memory and start executing
    C8.prototype.LoadResource = function (rom) {
        var self, i;

        self = this;

        for (i = 0; i < rom.length; i = i + 1) {
            this.m[i + 0x200] = rom[i];        
        }

        // start the main loop timers run at 60hz
        this.interval = setInterval(function () { self.ServiceTimers(); }, 1000 / 60);
    };

    // handle service timers
    C8.prototype.ServiceTimers = function () {
        var i;
        if (this.r_delay !== 0) {
            this.r_delay = this.r_delay - 1;
        }

        if (this.r_sound !== 0) {
            this.r_sound = this.r_sound - 1;
        }

        // handle this.rate instructions
        for (i = 0; i < this.rate; i = i + 1) {
            try {
                if (this.HandleInstruction() === false) {
                    // wait for key press
                    clearInterval(this.interval);
                    this.UpdateDisplay();
                }
            } catch (e1) {
                console.log('error: ' + e1);
                this.DumpState();
                if (this.interval !== null) {
                    clearInterval(this.interval);
                    return;
                }
            }
        }
        this.UpdateDisplay();
    };

    C8.prototype.DumpState = function () {
        var i, regs, stack;
        
        // dump program counter and stack pointer
        console.log('pc', this.HexDump(this.pc,2), 'sp', this.sp);

        // dump the registers
        regs = "";
        for (i = 0; i < this.r.length; i = i + 1) {
            regs = regs + "V" + i + ": 0x" + this.HexDump(this.r[i], 2) + " "; 
        } 
        regs = regs + "I: 0x" + this.HexDump(this.i, 4) + " ";
        regs = regs + "D: 0x" + this.HexDump(this.r_delay, 2) + " ";
        regs = regs + "S: 0x" + this.HexDump(this.r_sound, 2) + " ";
        
        console.log(regs);

        
        // dump the stack
        stack = ""; 
        for (i = 0; i < this.s.length; i = i + 1) {
            if (i < 10) {
                stack = stack + "0" + i;
            } else {
                stack = stack + i; 
            }

            stack = stack + ": 0x" + this.HexDump(this.s[i], 4) + " ";
            if (i % 4 === 0 && i !== 0) {
                stack = stack + "\n";
            }
        }
        console.log(stack);
    };

    C8.prototype.HexDump = function (num, padding) {
        var h;
        h = num.toString(16);
        while (h.length < padding) {
            h = "0" + h;
        }

        return h;
    };

    // handle a single instruction, as documented here:
    //
    // http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#3.1
    C8.prototype.HandleInstruction = function () {
        var op, v, nnn, n, x, y, kk, i, j, line, pixel_x, pixel_y, screen_index, pixel_value, cur_screen_value, new_screen_value, tmp;
        
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
            this.sp = this.sp - 1;
            if (this.sp < 0) {
                throw "stack pointer is negative";
            }
            this.pc = this.s[this.sp];
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
                case 0x4:       // skip instruction if Vx != kk
                    if (this.r[x] !== kk) {
                        this.pc = this.pc + 2;
                    }
                    break;
                case 0x5:
                    if (this.r[x] === this.r[y]) {
                        this.pc = this.pc + 2;
                    }
                    break;
                case 0x6:       // Load byte kk into Vx
                    this.r[x] = kk;
                    break;
                case 0x7:       // Add kk to Vx into Vx
                    this.r[x] = this.r[x] + kk;
                    break;
                case 0x8:
                    switch (n) {
                        case 0x0: // load
                            this.r[x] = this.r[y];
                            break;
                        case 0x1: // or
                            this.r[x] = (this.r[x] | this.r[y]) & 0xff;
                            break;
                        case 0x2: // and
                            this.r[x] = (this.r[x] & this.r[y]) & 0xff;
                            break;
                        case 0x3: // xor
                            this.r[x] = (this.r[x] ^ this.r[y]) & 0xff;
                            break;
                        case 0x4: // add
                            this.r[0xf] = 0;
                            tmp = this.r[x] + this.r[y];
                            if (tmp > 255) {
                                this.r[0xf] = 1;
                                tmp = tmp & 0xff;
                            }
                            this.r[x] = tmp;
                            break;
                        case 0x5: // sub
                            if (this.r[x] > this.r[y]) {
                                this.r[0xf] = 1;
                            } else {
                                this.r[0xf] = 0;
                            }
                            tmp = this.r[x] - this.r[y];
                            tmp = tmp & 0xff;
                            this.r[x] = tmp;
                            break;
                        case 0x6: // SHR 1
                            if (this.r[x] & 0x1 === 1) {
                                this.r[0xf] = 1;
                            } else {
                                this.r[0xf] = 0;
                            }
                            tmp = this.r[x] / 2;
                            tmp = tmp & 0xff;
                            this.r[x] = tmp;
                            break;
                        case 0x7: // SUBN
                            if (this.r[y] > this.r[x]) {
                                this.r[0xf] = 1;
                            } else {
                                this.r[0xf] = 0;
                            }
                            this.r[x] = this.r[y] - this.r[x];
                            break;
                        default:
                            throw "unhandled instruction: 0x" + op.toString(16);
                    }
                    break;
                case 0x9: // skip next instruction if vx != vy
                    if (this.r[x] !== this.r[y]) {
                        this.pc = this.pc + 2;
                    }
                    break;
                case 0xA:       // load value nnn into i
                    this.i = nnn;
                    break;
                case 0xC:       // random byte (0 - 255) & kk;
                    this.r[x] = Math.floor(Math.random() * 255) & kk;
                    break;
                case 0xD:       // display sprite
                    this.r[0xf] = 0;
                    for (i=0; i < n; i = i + 1) {
                        line = this.m[this.i + i];
                        for (j=0; j < 8; j = j + 1) {
                            pixel_x = (this.r[x] + j) % 64;
                            pixel_y = (this.r[y] + i) % 32;
                            screen_index    = (pixel_y * 64) + pixel_x;
                            pixel_value     = line >> (7 - j) & 1;
                            new_screen_value = this.screen[screen_index] ^ pixel_value;
                            cur_screen_value = this.screen[screen_index];

                            if (cur_screen_value === 1 && cur_screen_value !== new_screen_value) {
                                this.r[0xf] = 1;
                            }

                            if (new_screen_value !== cur_screen_value) {
                                this.screen[screen_index] = new_screen_value;
                                this.update[screen_index] = 1;
                                this.updateRequired = true;
                            }
                        }
                    }
                    break;
                case 0xE:
                    switch (kk) {
                        case (0x9e): 
                            if (this.keystate[this.r[x]] === true) {
                                this.pc = this.pc + 2;
                            }
                            break;
                        case (0xa1):
                            if (this.keystate[this.r[x]] === false) {
                                this.pc = this.pc + 2;
                            }
                            break;
                        default:
                            throw "unhandled instruction: 0x" + op.toString(16);
                    }
                    break;
                case 0xF:
                    switch (kk) {
                        case 0x07:  // place delay timer in Vx
                            this.r[x] = this.r_delay;
                            break;
                        case 0x0A: // key press always the same key for now
                            this.waitforkeypress = x;
                            return false;
                        case 0x15:  // set delay timer
                            this.r_delay = this.r[x];
                            break;
                        case 0x18: // set the sound timer
                            this.r_sound = this.r[x];
                            break;
                        case 0x1e: // I and Vx added and stored in I
                            this.i = this.i + this.r[x];
                            break;
                        case 0x29: // set I to location of sprite for value x
                            this.i = this.r[x] * 8;
                            break;
                        case 0x33: // store BCD representation of vx in memory locations I I+1 and I+2
                            this.m[this.i + 0] = this.r[x] / 100 % 10;
                            this.m[this.i + 1] = this.r[x] / 10 % 10;
                            this.m[this.i + 2] = this.r[x] % 10;
                            break;
                        case 0x55: // store registers v0 to vx to memory starting at location I
                            for (i=0; i <= x; i = i + 1) {
                                this.m[this.i + i] = this.r[i];
                            }
                            break;
                        case 0x65: // read registers v0 to vx from memory starting at I
                            for (i=0; i <= x; i = i + 1) {
                                this.r[i] = this.m[this.i + i];
                            }
                            break;
                        default:
                            throw "Unhandled instruction: 0x" + op.toString(16);
                    }
                    break;
                default:
                    throw "Unhandled instruction: 0x" + op.toString(16) + " " + v.toString(16);
            }
        }
        return true;
    };

    // clear the screen
    C8.prototype.ClearScreen = function () {
        var i;
        for (i = 0; i < this.screen.length; i = i + 1) {
            this.screen[i] = 0;
            this.update[i] = 1;
        } 

        this.updateRequired = true;

        this.UpdateDisplay();
    };

    // update the display
    C8.prototype.UpdateDisplay = function () {
        if (this.updateRequired === true) {
            this.render.Render(this.screen, this.update);
            this.updateRequired = false;
        }
    };

    return C8;
});

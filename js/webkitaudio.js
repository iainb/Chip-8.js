define([], function () {
   function Audio () {
        this.Init();
    }

    Audio.prototype.Init = function () {
        this.available = false;
        if(typeof window.webkitAudioContext !== 'undefined') {
	    	this.ctx = new webkitAudioContext();
    		this.oscillator = this.ctx.createOscillator();
            this.oscillator.type = 2; // saw tooth
	        this.oscillator.frequency.value = 460;
            this.available = true;
            this.on = false;
    	}
    };

    Audio.prototype.Start = function () {
        var ts;
        if (this.available === true && this.on === false) {
            this.oscillator.connect(this.ctx.destination);
            this.oscillator.noteOn(0);
            this.on = true;
        }
    };

    Audio.prototype.Stop = function () {
        if (this.available === true && this.on === true) {
            this.oscillator.disconnect();
            this.on = false;
        }
    };

    return Audio;
});

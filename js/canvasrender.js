define(['jquery'], function($) {
    
    function CanvasRender (div, on, off) {
        this.Init(div, on, off);
    }

    CanvasRender.prototype.Init = function(div, on, off) {
        this.base_x = 64;
        this.base_y = 32;
        this.multiplier = 20;
        this.redrawRequired = true;

        if (typeof div === "undefined") {
            // original display is 64x32
            this.div = $('<canvas/>')[0];
            $('body').append(this.div);
        } else {
            this.div = div;
        } 

        if (typeof on === "undefined") {
            // default 
            this.on = "#ffcc00";
        } else {
            this.on = on;
        }

        if (typeof off === "undefined") {
            // default
            this.off = "#996600";
        } else {
            this.off = off;
        }

        this.SetSizeMultiplier(this.multiplier);
    };

    CanvasRender.prototype.SetSizeMultiplier = function(m) {
        this.multiplier = m;
        $(this.div).attr('width',  this.base_x * this.multiplier);
        $(this.div).attr('height', this.base_y * this.multiplier); 
        this.redrawRequired = true;
    };

    CanvasRender.prototype.FillScreen = function () {
        var w,h, w_factor, h_factor, m;
        w = $(window).innerWidth()
        h = $(window).innerHeight();
        
        w_factor = Math.floor(w / this.base_x);
        h_factor = Math.floor(h / this.base_y);
        
        if (w_factor < h_factor) {
            m = w_factor;
        } else {
            m = h_factor;
        }

        this.SetSizeMultiplier(m);
    };


    // d is screen data, u is pixels which should be 
    // updated.
    CanvasRender.prototype.Render = function(d,u) {
        var context, i, x, y;
        context = this.div.getContext('2d');
        context.save();

        for (i = 0; i < d.length; i = i + 1) {
            if (u[i] === 1 || this.redrawRequired === true) {
                x = i % 64;
                y = Math.floor(i/64);
            
                if (d[i] === 0) {
                    context.fillStyle = this.off;
                } else {
                    context.fillStyle = this.on;
                }

                context.fillRect(x * this.multiplier,
                                 y * this.multiplier, 
                                 this.multiplier,
                                 this.multiplier);
                u[i] = 0;
            }
        }

        context.restore();

        if (this.redrawRequired === true) {
            this.redrawRequired = false;
        }
    };

    return CanvasRender;
});

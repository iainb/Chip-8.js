define(['jquery'], function($) {
    
    function CanvasRender (div, on, off) {
        this.Init(div, on, off);
    }

    CanvasRender.prototype.Init = function(div, on, off) {
        if (typeof div === "undefined") {
            // original display is 64x32
            this.div = $('<canvas/>')[0];
            $(this.div).attr('width',640);
            $(this.div).attr('height',320);
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
    };

    // d is screen data, u is pixels which should be 
    // updated.
    CanvasRender.prototype.Render = function(d,u) {
        var context, i, x, y;
        context = this.div.getContext('2d');
        context.save();

        for (i = 0; i < d.length; i = i + 1) {
            if (u[i] === 1) {
                x = i % 64;
                y = Math.floor(i/64);
            
                if (d[i] === 0) {
                    context.fillStyle = this.off;
                } else {
                    context.fillStyle = this.on;
                }

                context.fillRect(x*10,y*10, 10, 10);
                u[i] = 0;
            }
        }

        context.restore();
    };

    return CanvasRender;
});

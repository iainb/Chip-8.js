require.config({
    paths: {
        'jquery': './jquery-1.9.1.min'
    }
});

require(['jquery','chip-8', 'canvasrender'], function($, Chip8, CanvasRender) { 
    $(document).ready(function () {
        var c8, render;

        c8 = new Chip8();
        render = new CanvasRender($('#output')[0]);
        c8.SetRender(render);
        render.FillScreen();

        $('#hiddenload').on('change', function() {
            var reader, arraybuf, rom;
            if (this.files.length !== 0) {
                reader = new FileReader();
                reader.readAsArrayBuffer(this.files[0]);
                reader.onload = function(ev) {
                    rom = new Uint8Array(ev.target.result);
                    c8.Reset();
                    c8.SetRender(render);
                    c8.LoadResource(rom);
                }
           }
        });

        $('#load').on('click', function(e) {
            $('#hiddenload').click();
            e.preventDefault();
        });

        $(window).resize(function() {
            render.FillScreen();
        });

        //c8.LoadFromUrl("/roms/Trip8.ch8");
        c8.LoadFromUrl("roms/Space Invaders.ch8");

    });


});

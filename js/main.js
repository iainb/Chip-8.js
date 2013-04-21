$(document).ready(function () {
    var c8;

    c8 = new C8();
    render = new CanvasRender();
    c8.SetRender(render);
    c8.LoadFromUrl("/roms/Trip8.ch8");
    //c8.LoadFromUrl("/roms/jumping_x_and_o.ch8");
    //c8.LoadFromUrl("/roms/IBM Logo.ch8");
    //c8.LoadFromUrl("/roms/Framed MK1 [GV Samways, 1980].ch8");
    //c8.LoadFromUrl("/roms/Maze.ch8");
    //c8.LoadFromUrl("/roms/Life.ch8");
    //c8.LoadFromUrl("/roms/Fishie.ch8");
    //c8.LoadFromUrl("/roms/Zero Demo.ch8");
});

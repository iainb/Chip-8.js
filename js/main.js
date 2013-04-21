$(document).ready(function () {
    var c8;

    c8 = new C8();
    render = new CanvasRender();
    c8.SetRender(render);
    c8.LoadFromUrl("/roms/Trip8.ch8");
});

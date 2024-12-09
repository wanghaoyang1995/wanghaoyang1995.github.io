layui.use(function(){
  let layer = layui.layer;
  let util = layui.util;
  let $ = layui.$;

  let element = layui.element;
  element.render("nav");

  util.on("lay-on", {
    "collapsible_menu_show": function(){
      layer.open({
        type: 1,
        offset: "l",
        anim: "slideRight", // 从左往右
        area: "auto",
        shade: 0.1,
        shadeClose: true,
        //id: "nav_side",
        content: $("#nav_side"),
      });
    },
  });
});

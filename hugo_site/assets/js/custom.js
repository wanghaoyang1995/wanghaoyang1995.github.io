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
    "btn_copy_link": function() {
      const urlToCopy = window.location.href;
      navigator.clipboard.writeText(urlToCopy).then(function() {
        layer.msg('{{T "copy_link_success"}}');
      }).catch(function(error) {
        console.error('copy link error:', error);
      });
    },
    "btn_share_weibo": function() {
      shareSinaWeiBo(document.title, window.location.href, null);
    },
    "btn_share_qq": function() {
      shareQQ(document.title, window.location.href, null);
    },
    "btn_share_weixin": function() {
      layer.open({
        type: 1,
        area: "auto", // 宽高
        title: false, // 不显示标题栏
        closeBtn: 0,
        shadeClose: true, // 点击遮罩关闭层
        content: $("#qrcode"),
      });
    },
    "go_back_to_previous_page": function() {
      window.history.back();
    },
    "avatar_clicked": function() {
      let elem = $("#author_avatar");
      if (elem.hasClass("layui-anim")) {
        elem.removeClass("layui-anim layui-anim-rotate layui-anim-loop");
      } else {
        elem.addClass("layui-anim layui-anim-rotate layui-anim-loop");
      }
    },
  });
});

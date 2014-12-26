$(document).ready(function() {
  if($('.info').length > 0) {
    window.setTimeout(function() {
      $('.info').slideUp(400)
    }, 5000);
  } else if ($('.error').length > 0) {
    window.setTimeout(function() {
      $('.error').slideUp(400)
    }, 5000);
  }
  $('.menu-tab .down').click(function() {
    $('.menu-nav').slideDown(400);
    $('.menu-tab .up').show();
    $('.menu-tab .down').hide();
    var getTop = ($('ul.nav li').length * 4) + 'em';
    $('.menu-tab').animate({
      top: getTop
    },400);
  });
  $('.menu-tab .up').click(function() {
    $('.menu-nav').slideUp(400);
    $('.menu-tab .down').show();
    $('.menu-tab .up').hide();
    $('.menu-tab').animate({
      top: 0
    },400);
  });
});

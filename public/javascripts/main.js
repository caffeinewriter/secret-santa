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
});

(function () {
  "use strict";

  var ACCESS_TOKEN = 'def6ea2c1d137119bfaac65a3068628aafc47cfb';

  function thisBrowserIsBad() {
    alert("dude use a different browser");
  }

  function getStream(callback, fail) {
    (navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia || thisBrowserIsBad).call(navigator, {video: true}, callback, fail);
  }

  var facetogif = {
    settings: { w: 550, h: 413, framerate: 1000/10, seconds: 3000, countdown: 4000 },
    canvas: null,
    video: null,
    stream: null,
    blobs: [],
    frames: []
  };

  var recorder = {
    gif: null,
    interval: null,
    frames: [],
    ctx: null,
    start: function () {
      this.interval = setInterval(this.record(this.ctx, this.frames, this.gif), facetogif.settings.framerate);
    },
    pause: function () {
      clearInterval(this.interval);
    },
    compile: function (callback) {
      this.gif.on('finished', function (blob) { callback(blob); });
      this.gif.render();
    },
    record: function(ctx, frames, gif) {
      return function () {
        if (facetogif.video.src) {
          ctx.drawImage(facetogif.video, 0, 0, facetogif.settings.w, facetogif.settings.h);
          var frame = ctx.getImageData(0, 0, facetogif.settings.w, facetogif.settings.h);
          frames.push(frame);
          gif.addFrame(frame, {delay: facetogif.settings.framerate});
        } else {
          clearInterval(this.interval);
        }
      }
    },
    upload: function(blob, $imageContainer) {
      console.log('uploading...');

      var reader = new window.FileReader();
         
      reader.onloadend = function() {
        var base64data = reader.result;
        base64data = base64data.split('data:image/gif;base64,')[1];            

        $.ajax({
          url: 'https://api.imgur.com/3/image',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + ACCESS_TOKEN,
            Accept: 'application/json'
          },
          data: {
            image: base64data,
            type: 'base64'
          },
          success: function(result) {
            var id = result.data.id;
            $imageContainer.find('.post-id').html('imgur.com/'+id);
          },
          error: function(result) {
            console.log(result);
          }
        });

        /*
        //old tumblr upload

        $.post('upload.php', JSON.stringify({ src: base64data }), function(data){
          var response = JSON.parse((data.split('=')[1]).toString());
          console.log(response)
          $imageContainer.find('.post-id').html(response.response.id);
        }).error(function(){
          console.log('error sending image to php');
        });
        */
      }

      reader.readAsDataURL(blob);
    }
  };

  $(window).load(function(){
    facetogif.canvas = document.createElement('canvas');
    facetogif.canvas.width = facetogif.settings.w;
    facetogif.canvas.height = facetogif.settings.h;
    facetogif.video = document.querySelector('video');
    $('#record-button').attr('disabled', true);

    getStream(function (stream) {
      facetogif.video.src = window.URL.createObjectURL(stream);
      facetogif.stream = stream;
      $('#record-button').attr('disabled', false);
    }, function (fail) {
      console.log(fail);
    });

    $('#record-button').click(function(){ go(); });
    $(window).keypress(function(){ go(); });

    function go(){
      var $recordButton = $(this);
      $recordButton.attr('disabled', true);
      $('#gifs-go-here').fadeOut(200);
      $('#instructions').fadeOut(200);
      $('#message').fadeIn(200);

      recorder.gif = new GIF({
        workers: 4,
        width: facetogif.settings.w,
        height: facetogif.settings.h,
        quality: 20,
        workerScript: 'js/vendor/gif.worker.js'
      });

      recorder.frames = [];
      recorder.ctx = facetogif.canvas.getContext('2d');

      //wait 4 seconds then record
      var count = facetogif.settings.countdown/1000;
      function countdown(){

        if(count > 1){ 
          $('#message-text').html('RECORDING IN <span id="count">'+(count-1)+'</span>');
          setTimeout(function(){ count--; countdown(); }, 1000); 
        }else{
          $('#message-text').html('<span id="count">GO!</span>');
        }
      }
      countdown();

      setTimeout(function(){
        $('#message').fadeOut(200);
        $('#indicator').fadeIn(200);
        $('#progress').animate({width: '100%'}, facetogif.settings.seconds);
        recorder.start();
        
        //wait 3 seconds then compile
        console.log('compiling in 3...2...1');
        setTimeout(function(){
          $('#message-text').text('COMPILING!');
          $('#message').fadeIn(200);
          $('#indicator').fadeOut(200);
          
          recorder.pause();
          recorder.compile(function (blob) {
            var img = document.createElement('img');
            img.src = URL.createObjectURL(blob);
            img.dataset.blobindex = facetogif.blobs.push(blob) -1;
            img.dataset.framesindex = facetogif.frames.push(recorder.frames) -1;
            
            if($('#gifs-go-here').children('.image-container').length === 4){
              $('#gifs-go-here').children('.image-container').last().remove();
            }

            var $imageContainer = $('<div class="image-container"></div>');
            $imageContainer.append('<div class="post-id">UPLOADING...</div>');
            $imageContainer.append($(img));
            $imageContainer.prependTo('#gifs-go-here');
            $recordButton.attr('disabled', false);
            $('#progress').animate({width: '0%'}, 1000);
            $('#gifs-go-here').fadeIn(200);
            $('#message').fadeOut(200);
            $('#instructions').fadeIn(200);
            recorder.upload(blob, $imageContainer);
          });

        }, facetogif.settings.seconds);
      }, facetogif.settings.countdown);
    }

  });


} ());

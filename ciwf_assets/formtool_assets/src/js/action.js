import jQuery from 'jquery';
import Cookiebar from 'mo-cookiebar';
import { iframeResizer } from 'iframe-resizer';

import './jquery.recent-supporters';
import './validation';

const $ = jQuery;

(function (window) {
  var cookiebar = new Cookiebar({
    el: '#cookiebar',
    closeClass: 'cookie-close'
  });
}(window));

(function ($) {
  'use strict';
  var settings = Formtool.settings;
  var $progressBar = $('.progress-bar');

  // returns the next target, or 0 if none is found
  function getNextTarget(targets, currentCount, minDelta) {
    // defaults
    var targets = typeof targets !== 'undefined' ? targets : [ 100 ];
    var currentCount = typeof currentCount !== 'undefined' ? currentCount : 0;
    var minDelta = typeof minDelta !== 'undefined' ? minDelta : 0;

    // TODO targets string to Array

    // find all target values which are *greater* than the currentCount
    // return the minimum of these, i.e. next target
    var possibleTargets = targets.filter(function (value) {
      return value > (this + minDelta);
    }, currentCount);
    var possibleTarget = Math.min.apply(null, possibleTargets);
    // return 0 if no target is found
    // TODO special case when minDelta is set?
    if (!isNaN(possibleTarget) && isFinite(possibleTarget)) {
      return possibleTarget;
    } else {
      return 0;
    }
  }
  var socialproofUrl = settings['logcrm']['base_url'] + settings['logcrm']['endpoints']['socialproof'] + settings['uuid'] + '?key=' + settings.logcrm.keys.socialproof.pk;

  $.ajax({
    url: socialproofUrl
  }).done(function(data) {
    var count = parseInt(data.count, 10);
    var nextTarget = getNextTarget(settings['targets'], count);
    var percent = 0;
    var remainingCount = nextTarget;
    if (count > nextTarget) {
      percent = 100;
      remainingCount = 0;
    } else {
      percent = Math.floor((count/nextTarget)*100);
      remainingCount = nextTarget - count;
    }
    if ($progressBar.length > 0) {
      $progressBar.css({width: percent+'%'});
    }
    $('.counter[data-action-uuid='+settings['uuid']+']').text(count);
    $('.countdowner[data-action-uuid='+settings['uuid']+']').text(remainingCount);
  });


  if ($('#supporters').length > 0) {
    var rc = $('#supporters').recentSupporters({
      pollURL: socialproofUrl
    });
    rc.start();
  }
  // check if the requesting devise ist an Android or iPhone
  // and show the whatsapp sharing link when true
  var showWhatsapp = ((navigator.userAgent.match(/Android|iPhone/i) && !navigator.userAgent.match(/iPod|iPad/i)) ? true : false);
  if (showWhatsapp) {
    $('.share .share-whatsapp').removeClass('d-none');
  }
})(jQuery);

(function() {
  if (window.__twitterIntentHandler) return;
  var intentRegex = /twitter\.com(\:\d{2,4})?\/intent\/(\w+)/,
  facebookRegex = /facebook\.com(\:\d{2,4})?\/sharer.php/,
  windowOptions = 'scrollbars=yes,resizable=yes,toolbar=no,location=yes',
  width = 550,
  height = 420,
  winHeight = screen.height,
  winWidth = screen.width;

  function handleIntent(e) {
    e = e || window.event;
    var target = e.target || e.srcElement,
    m, f, left, top;

    while (target && target.nodeName.toLowerCase() !== 'a') {
      target = target.parentNode;
    }

    if (target && target.nodeName.toLowerCase() === 'a' && target.href) {
      m = target.href.match(intentRegex);
      f = target.href.match(facebookRegex);
      if (m || f) {
        left = Math.round((winWidth / 2) - (width / 2));
        top = 0;

        if (winHeight > height) {
          top = Math.round((winHeight / 2) - (height / 2));
        }

        window.open(target.href, 'intent', windowOptions + ',width=' + width +
                    ',height=' + height + ',left=' + left + ',top=' + top);
        e.returnValue = false;
        e.preventDefault && e.preventDefault();
      }
    }
  }

  if (document.addEventListener) {
    document.addEventListener('click', handleIntent, false);
  } else if (document.attachEvent) {
    document.attachEvent('onclick', handleIntent);
  }
  window.__twitterIntentHandler = true;
}());

(function ($) {
  // enable form validation
  var $form = $("form.parsley-validate");
  if ($form.length) {
    $form.parsley({
      successClass: "has-success",
      errorClass: "has-error",
      classHandler: function(el) {
        return el.$element.closest(".form-group");
      },
      errorsWrapper: "<ul></ul>",
      errorTemplate: "<li></li>",
      trigger: 'blur'
    }).on('field:error', function(){
      var field = this.$element;
      field.attr('aria-invalid', true);
      field.removeClass('is-valid');
      field.addClass('is-invalid');
    }).on('field:success', function(){
      var field = this.$element;
      field.attr('aria-invalid', false);
      field.removeClass('is-invalid');
      field.addClass('is-valid');
    });
  }
})(jQuery);

(function ($) {
  function collapseOptins() {
    var val = $('.optin-field [name=newsletter]:checked').val();
    var yesField = $('.optin-field [name=newsletter][value=yes]').attr('id');
    var noField = $('.optin-field [name=newsletter][value=no]').attr('id');
    if (val === "yes") {
      $('#text-' + yesField).collapse('show');
      $('#text-' + noField).collapse('hide');
    } else if (val === "no") {
      $('#text-' + yesField).collapse('hide');
      $('#text-' + noField).collapse('show');
    } else {
      $('#text-' + yesField).collapse('hide');
      $('#text-' + noField).collapse('hide');
    }
  };
  // on load
  collapseOptins();
  // on update
  $('.optin-field [name=newsletter]').on('change', function () {
    collapseOptins();
  });
})(jQuery);

(function ($) {
  // ECI iFrame
  var iframeID = '#eci';
  var origin = 'https://eci.endthecageage.eu'
  var msg = 'to parent: hello';  // message from ECI tool
  var $step1Container = $('#hide-on-ty').show();
  var $step2Container = $('#show-on-ty').hide();

  if ($(iframeID).length) {
    new iframeResizer({}, iframeID);
    window.addEventListener("message", function(event) {
      if (event.origin !== origin) {
        // ignore events from unknown sources
        return
      }
      if (event.data === msg) {
        // the iFrame shows the thank you page
        $step1Container.hide();
        $step2Container.show();
      }
    });
  }

})(jQuery);

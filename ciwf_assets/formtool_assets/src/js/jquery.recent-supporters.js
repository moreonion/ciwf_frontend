/*!
 * jQuery plugin to load and display a recent supporters listing on your website
 *
 * v2
 *
 * Copyright (c) 2015 more onion
 * Released under the MIT license
 *
 */

/**
 * TODOs
 *
 * - parse markup of container and use as initial state
 * - set headers for polling (options for $.ajax())
 * - documentation
 * - reverse compatibility
 * - polling interval
 * - max supporters
 * - optional underscore
 * - events: changed, newSupporters, rendered
 * - no activity yet
 * - garbage collect supporterStore
 * - API for trigger events (args for manipulation)
 * - API for callbacks (docs, args for manipulation)
 * - tokens
 * - supporter render as div/li/...
 * - timestamp/date/... which are mandatory fields for supporters?
 * - race conditions when re-rendering?
 * - update markup for cycle animation vs set data structure, then call render?
 * - cylce up or down
 * - "use strict"
 * - requirejs, AMD
 * - data-action-uuid
 * - performance: try to poll earlier
 */

import jQuery from 'jquery';
import 'timeago';

const $ = jQuery;

(function ( $ ) {

  $.fn.recentSupporters = function( options ) {

    // These are the defaults.
    var defaults = {
      pollURL: null,
      pollFn: null,
      maxSupportersVisible: 6,
      maxSupportersInContainer: 10,
      showCountry: true,
      countries: $.fn.recentSupporters.countries,
      cycleInterval: 1500,
      pollInterval: 5000,
      prefillSupporters: true,
      supporters: [],
      updateTimeagoInterval: 2000
    }
    var settings = $.extend({}, defaults, options );
    var $container = this;

    // TODO expects properties to be set correctly
    function compareSupporterFn(a, b) {
      if (a.timestamp && b.timestamp) {
        if (a.timestamp < b.timestamp) {
          return -1;
        }
        if (a.timestamp > b.timestamp) {
          return 1;
        }
      }
      // from here timestamps are the same
      if (a.surname && b.surname) {
        if (a.surname < b.surname) {
          return -1;
        }
        if (a.surname > b.surname) {
          return 1;
        }
      }
      // from here surnames are the same
      if (a.givenName && b.givenName) {
        if (a.givenName < b.givenName) {
          return -1;
        }
        if (a.givenName > b.givenName) {
          return 1;
        }
      }
      // now no greater or less could be decided
      // they must be the same
      return 0;
    }

    // http://stackoverflow.com/questions/2218999/remove-duplicates-from-an-array-of-objects-in-javascript
    function unique(a, compareFunc){
      a.sort(compareFunc);
      for(var i = 1; i < a.length; ){
        if (compareFunc(a[i-1], a[i]) === 0) {
          a.splice(i, 1);
        } else {
          i++;
        }
      }
      a.reverse();
      return a;
    }

    function Supporter() {
      this.givenName = null;
      this.surname = null;
      this.timestamp = null;
      this.date = null;
      this.country = null;
    };
    Supporter.prototype.render = function () {
      var el = $('<li>');
      var timestamp = this.timestamp || Math.floor(new Date().getTime() / 1000);
      var surname = '<span class="surname">'+this.surname+'</span>';
      var name = [this.givenName, surname].join(" ");
      var nameHtml = '<span class="name">'+name+'</span>';
      var timeHtml = '<time class="time" data-timestamp="'+timestamp+'" data-date="'+this.date.toISOString()+'" datetime="'+this.date.toISOString()+'" title="'+this.date.toISOString()+'">'+this.date.toLocaleString()+'</time>';
      var countryHtml = '';
      if (settings.showCountry) {
        var countryCode = this.country ? this.country.toLowerCase() : "no-cc";
        var countryName = countryCode in settings.countries ? settings.countries[countryCode] : '';
        var countryHtml = '<span title="'+countryName+'" class="country flag flag-'+countryCode+'">'+countryCode+'</span> ';
      }
      var supporterHtml = countryHtml + nameHtml + " " + timeHtml;
      el.addClass('supporter').append(supporterHtml);
      return el;
    }

    function Poller(url) {
      this.lastPoll;
      this.pollURL = url || null;
      this.interval = null;
    };
    // return list of supporter objects
    Poller.prototype.defaultPollFn = function () {
      return $.ajax({
        url: this.pollURL
      }).then(function(data) {
        return { supporters: $.map(data.recent, function(d, i) {
          var supporter = new Supporter();
          supporter.givenName = d.first_name;
          supporter.surname = d.last_name;
          supporter.date = new Date(d.date);
          supporter.timestamp = Math.floor(supporter.date.getTime()/1000);
          supporter.country = d.country;
          return supporter;
        }) };
      });
    }
    // calls a configured pollFn or the defaultPollFn otherwise
    // expects the pollFn to return an deferred
    Poller.prototype._poll = function () {
      var pollPromise;
      if (typeof settings.pollFn === 'function') {
        pollPromise = settings.pollFn.call(this);
      } else {
        pollPromise = this.defaultPollFn.call(this);
      }

      pollPromise.done(function (data) {
        renderer.addSupporters(data.supporters);
      }).fail(function () {
        console.log("failed polling");
      });
    };
    Poller.prototype.poll = function (state) {
      if (typeof state === 'undefined' || state === "start") {
        var me = this;
        clearInterval(this.interval); // we want only one interval per renderer
        this.interval = setInterval(function() {
          me._poll.call(me)
        }, settings.pollInterval);
      }
      if (state === "stop") {
        clearInterval(this.interval);
      }
    }

    function Renderer(el) {
      this.$el = $(el);
      this.$ul = $('.recent-supporters', this.$el);
      // array of supporters, newest first
      this.supporterStore = [];
      this.supporterCount = 0;
      this.interval = null;
      this.pointer = 0;
      this.cycle = 0;
    }
    Renderer.prototype.empty = function () {
      return $('ul.recent-supporters', this.$el).length > 0 ? false : true;
    }

    Renderer.prototype.addRawSupporters = function (supporters) {
      // TODO check for array
      if (typeof supporters === 'undefined') {
        return;
      }
      var supportersObjs = $.map(supporters, function(d, i) {
        var supporter = new Supporter();
        supporter.givenName = d.giveNname;
        supporter.surname = d.surname;
        supporter.date = d.date;
        supporter.timestamp = Math.floor(supporter.date.getTime()/1000);
        supporter.country = d.country;
        return supporter;
      });
      this.addSupporters(supportersObjs);
      return this; // concatenable object
    }

    Renderer.prototype.addSupporters = function (supporters) {
      // TODO check for array
      if (typeof supporters === 'undefined') {
        return;
      }
      this.supporterStore = $.merge(this.supporterStore, supporters);
      this.supporterStore = unique(this.supporterStore, compareSupporterFn);
      var newCount = this.supporterStore.length;
      // if new supporters have been added emit event
      if (newCount > this.supporterCount) {
        this.$el.trigger('addsupporters.recentsupporters');
      }
      this.supporterCount = newCount;
      var a = this.supporterStore; // DEBUG
      return this; // concatenable object
    };
    Renderer.prototype.getSupportersForDisplay = function () {
      return this.supporterStore.slice(0, settings.maxSupportersInContainer);
    };
    Renderer.prototype.render = function () {
      // ensure element
      if (this.empty()) {
        this.$el.append('<ul class="recent-supporters">');
        this.$ul = $('.recent-supporters', this.$el);
      }

      var $newUl = $("<ul class=\"recent-supporters\">");
      var supportersToDisplay = this.getSupportersForDisplay();
      // honor the pointer which tells us which supporter is the
      // first on the list to display
      // the display could have been cycled, the supporterStore is not
      var rearranged = $.merge(supportersToDisplay.slice(this.pointer), supportersToDisplay.slice(0, this.pointer));
      $.each(rearranged, function (i, s) {
        var $s = s.render();
        if (i > (settings.maxSupportersVisible - 1)) {
          $s.hide();
        }
        $newUl.append($s);
      });
      this.$ul.replaceWith($newUl);
      this.$ul = $newUl;
      this.$el.trigger('render.recentsupporters');
    }
    Renderer.prototype.animate = function (state) {
      if (typeof state === 'undefined' || state === "start") {
        var me = this;
        clearInterval(this.interval); // we want only one interval per renderer
        this.interval = setInterval(function() {
          me.cycleSupporter.call(me)
        }, settings.cycleInterval);
      }
      if (state === "stop") {
        clearInterval(this.interval);
      }
    }
    Renderer.prototype.cycleSupporter = function () {
      var $supporters = $('li', this.$ul);
      var hideCycled = $supporters.length > settings.maxSupportersVisible;
      var last = $supporters.last();
      // only cycling if at least 2 supporters
      if ($supporters.length < 2) {
        return;
      }
      if (hideCycled) {
        last.hide().detach();
        this.$ul.prepend(last);
        $('li:visible', this.$ul).last().slideUp({duration: 200});
        last.slideDown({duration: 200});
      } else {
        var clone = last.clone(true);
        this.$ul.append(clone);
        last.hide().detach().prependTo(this.$ul);
        clone.show().slideUp({
          duration: 200,
          complete: function() {
            clone.remove();
          }
        });
        last.slideDown({duration: 200});
      }
      // update pointer to point to first visible supporter
      this.cycle = (this.cycle + 1) % $supporters.length;
      this.pointer = $supporters.length - this.cycle - 1;
    }

    var poller = new Poller(settings.pollURL);
    var renderer = new Renderer($container);

    // expose poller and renderer
    this.poller = poller;
    this.renderer = renderer;

    this.start = function() {
      // add prefill suporters early
      if (settings.prefillSupporters) {
        renderer.addRawSupporters(settings.supporters).render();
        // call timeago (if available)
        if ($.fn.timeago) {
          $('time.time', $container).timeago('updateFromDOM');
        }
      }

      poller.poll();
      $container.on('addsupporters.recentsupporters', function() {
        renderer.render();
        // call timeago (if available)
        if ($.fn.timeago) {
          $('time.time', $container).timeago('updateFromDOM');
        }
      })

      if ($.fn.timeago) {
        setInterval(function() {
          $('time.time', $container).timeago('updateFromDOM');
        }, settings.updateTimeagoInterval);
      }

      renderer.animate();
    }

    return this;
  }

  // default ISO 3166-1 country codes and english names list
  // indexed by lower case
  // overrideable via plugin call option
  $.fn.recentSupporters.countries = {
    "no-cc": "Unknown",
    "af": "Afghanistan",
    "ax": "Aland Islands",
    "al": "Albania",
    "dz": "Algeria",
    "as": "American Samoa",
    "ad": "Andorra",
    "ao": "Angola",
    "ai": "Anguilla",
    "aq": "Antarctica",
    "ag": "Antigua and Barbuda",
    "ar": "Argentina",
    "am": "Armenia",
    "aw": "Aruba",
    "au": "Australia",
    "at": "Austria",
    "az": "Azerbaijan",
    "bs": "Bahamas",
    "bh": "Bahrain",
    "bd": "Bangladesh",
    "bb": "Barbados",
    "by": "Belarus",
    "be": "Belgium",
    "bz": "Belize",
    "bj": "Benin",
    "bm": "Bermuda",
    "bt": "Bhutan",
    "bo": "Plurinational State of Bolivia",
    "bq": "Bonaire, Saint Eustatius and Saba",
    "ba": "Bosnia and Herzegovina",
    "bw": "Botswana",
    "bv": "Bouvet Island",
    "br": "Brazil",
    "io": "British Indian Ocean Territory",
    "bn": "Brunei Darussalam",
    "bg": "Bulgaria",
    "bf": "Burkina Faso",
    "bi": "Burundi",
    "kh": "Cambodia",
    "cm": "Cameroon",
    "ca": "Canada",
    "cv": "Cape Verde",
    "ky": "Cayman Islands",
    "cf": "Central African Republic",
    "td": "Chad",
    "cl": "Chile",
    "cn": "China",
    "cx": "Christmas Island",
    "cc": "Cocos (Keeling) Islands",
    "co": "Colombia",
    "km": "Comoros",
    "cg": "Congo",
    "cd": "The Democratic Republic of the Congo",
    "ck": "Cook Islands",
    "cr": "Costa Rica",
    "ci": "Cote d'Ivoire",
    "hr": "Croatia",
    "cu": "Cuba",
    "cw": "Curacao",
    "cy": "Cyprus",
    "cz": "Czech Republic",
    "dk": "Denmark",
    "dj": "Djibouti",
    "dm": "Dominica",
    "do": "Dominican Republic",
    "ec": "Ecuador",
    "eg": "Egypt",
    "sv": "El Salvador",
    "gq": "Equatorial Guinea",
    "er": "Eritrea",
    "ee": "Estonia",
    "et": "Ethiopia",
    "fk": "Falkland Islands (Malvinas)",
    "fo": "Faroe Islands",
    "fj": "Fiji",
    "fi": "Finland",
    "fr": "France",
    "gf": "French Guiana",
    "pf": "French Polynesia",
    "tf": "French Southern Territories",
    "ga": "Gabon",
    "gm": "Gambia",
    "ge": "Georgia",
    "de": "Germany",
    "gh": "Ghana",
    "gi": "Gibraltar",
    "gr": "Greece",
    "gl": "Greenland",
    "gd": "Grenada",
    "gp": "Guadeloupe",
    "gu": "Guam",
    "gt": "Guatemala",
    "gg": "Guernsey",
    "gn": "Guinea",
    "gw": "Guinea-Bissau",
    "gy": "Guyana",
    "ht": "Haiti",
    "hm": "Heard Island and McDonald Islands",
    "va": "Holy See (Vatican City State)",
    "hn": "Honduras",
    "hk": "Hong Kong",
    "hu": "Hungary",
    "is": "Iceland",
    "in": "India",
    "id": "Indonesia",
    "ir": "Islamic Republic of Iran",
    "iq": "Iraq",
    "ie": "Ireland",
    "im": "Isle of Man",
    "il": "Israel",
    "it": "Italy",
    "jm": "Jamaica",
    "jp": "Japan",
    "je": "Jersey",
    "jo": "Jordan",
    "kz": "Kazakhstan",
    "ke": "Kenya",
    "ki": "Kiribati",
    "kp": "Democratic People's Republic of Korea",
    "kr": "Republic of Korea",
    "kw": "Kuwait",
    "kg": "Kyrgyzstan",
    "la": "Lao People's Democratic Republic",
    "lv": "Latvia",
    "lb": "Lebanon",
    "ls": "Lesotho",
    "lr": "Liberia",
    "ly": "Libyan Arab Jamahiriya",
    "li": "Liechtenstein",
    "lt": "Lithuania",
    "lu": "Luxembourg",
    "mo": "Macao",
    "mk": "The Former Yugoslav Republic of Macedonia",
    "mg": "Madagascar",
    "mw": "Malawi",
    "my": "Malaysia",
    "mv": "Maldives",
    "ml": "Mali",
    "mt": "Malta",
    "mh": "Marshall Islands",
    "mq": "Martinique",
    "mr": "Mauritania",
    "mu": "Mauritius",
    "yt": "Mayotte",
    "mx": "Mexico",
    "fm": "Federated States of Micronesia",
    "md": "Republic of Moldova",
    "mc": "Monaco",
    "mn": "Mongolia",
    "me": "Montenegro",
    "ms": "Montserrat",
    "ma": "Morocco",
    "mz": "Mozambique",
    "mm": "Myanmar",
    "na": "Namibia",
    "nr": "Nauru",
    "np": "Nepal",
    "nl": "Netherlands",
    "nc": "New Caledonia",
    "nz": "New Zealand",
    "ni": "Nicaragua",
    "ne": "Niger",
    "ng": "Nigeria",
    "nu": "Niue",
    "nf": "Norfolk Island",
    "mp": "Northern Mariana Islands",
    "no": "Norway",
    "ps": "Occupied Palestinian Territory",
    "om": "Oman",
    "pk": "Pakistan",
    "pw": "Palau",
    "pa": "Panama",
    "pg": "Papua New Guinea",
    "py": "Paraguay",
    "pe": "Peru",
    "ph": "Philippines",
    "pn": "Pitcairn",
    "pl": "Poland",
    "pt": "Portugal",
    "pr": "Puerto Rico",
    "qa": "Qatar",
    "re": "Reunion",
    "ro": "Romania",
    "ru": "Russian Federation",
    "rw": "Rwanda",
    "bl": "Saint Barthelemy",
    "sh": "Saint Helena, Ascension and Tristan da Cunha",
    "kn": "Saint Kitts and Nevis",
    "lc": "Saint Lucia",
    "mf": "Saint Martin (French part)",
    "pm": "Saint Pierre and Miquelon",
    "vc": "Saint Vincent and The Grenadines",
    "ws": "Samoa",
    "sm": "San Marino",
    "st": "Sao Tome and Principe",
    "sa": "Saudi Arabia",
    "sn": "Senegal",
    "rs": "Serbia",
    "sc": "Seychelles",
    "sl": "Sierra Leone",
    "sg": "Singapore",
    "sx": "Sint Maarten (Dutch part)",
    "sk": "Slovakia",
    "si": "Slovenia",
    "sb": "Solomon Islands",
    "so": "Somalia",
    "za": "South Africa",
    "gs": "South Georgia and the South Sandwich Islands",
    "es": "Spain",
    "lk": "Sri Lanka",
    "sd": "Sudan",
    "sr": "Suriname",
    "sj": "Svalbard and Jan Mayen",
    "sz": "Swaziland",
    "se": "Sweden",
    "ch": "Switzerland",
    "sy": "Syrian Arab Republic",
    "tw": "Taiwan, Province of China",
    "tj": "Tajikistan",
    "tz": "United Republic of Tanzania",
    "th": "Thailand",
    "tl": "Timor-Leste",
    "tg": "Togo",
    "tk": "Tokelau",
    "to": "Tonga",
    "tt": "Trinidad and Tobago",
    "tn": "Tunisia",
    "tr": "Turkey",
    "tm": "Turkmenistan",
    "tc": "Turks and Caicos Islands",
    "tv": "Tuvalu",
    "ug": "Uganda",
    "ua": "Ukraine",
    "ae": "United Arab Emirates",
    "gb": "United Kingdom",
    "us": "United States",
    "um": "United States Minor Outlying Islands",
    "uy": "Uruguay",
    "uz": "Uzbekistan",
    "vu": "Vanuatu",
    "ve": "Bolivarian Republic of Venezuela",
    "vn": "Viet Nam",
    "vg": "British Virgin Islands",
    "vi": "U.S. Virgin Islands",
    "wf": "Wallis and Futuna",
    "eh": "Western Sahara",
    "ye": "Yemen",
    "zm": "Zambia",
    "zw": "Zimbabwe"
  };
})(jQuery);

// @flow
import {AlexaSkill, Response} from './alexa/AlexaSkill';
import type {
  Session,
  Slot,
  Event,
  Context,
  Intent,
  ResponseT,
  LaunchRequest,
  SessionStartedRequest,
} from './alexa/AlexaTypes';
import _ from 'lodash';
import fetch from 'node-fetch';
import bluebird from 'bluebird';
fetch.Promise = bluebird;
import queryString from 'query-string';

let APP_ID;

class UberChecker extends AlexaSkill {
  constructor() {
    super(APP_ID);
    this._setupEventHandlers();
  };

  _setupEventHandlers = () => {
    this.eventHandlers.onSessionStarted = (req: SessionStartedRequest, session: Session): void => {
      console.log('Session started: ' + session.sessionId);
    };
    this.eventHandlers.onLaunch = (req: LaunchRequest, session: Session, res: Response): void => {
      console.log("UberChecker onLaunch requestId: " + req.requestId + ", sessionId: " + session.sessionId);
      const speech = { type: 'PlainText', text: 'Welcome to Ride Pal, you can ask for price estimates.', };
      const reprompt = { outputSpeech: { type: 'PlainText', text: 'Ask for a price.' } };
      res.ask(speech, reprompt);
    };
  };

  intentHandlers = {
    OneShotPriceCheck: (intent: Intent, session: Session, res: Response): void => {
      const addr: Slot = intent.slots.Address;
      geocodeAddress(addr.value)
        .then((loc: GeocodeLoc) => {
          checkPrice(loc)
            .then((prices: Array<UberPrice>) => {
              const uberX = prices[0];
              const msg = 'The price of an uber X to ' + loc.name + ' at ' + loc.address + ' is between $' + uberX.low_estimate + ' and $' + uberX.high_estimate;
              res.tell({type: 'PlainText', text: msg});
            });
        });
    },
    "AMAZON.HelpIntent": (intent: Intent, session: Session, res: Response): void => {
      const speech = { type: 'PlainText', text: 'Welcome to Uber Checker, you can ask for price estimates.', };
      const reprompt = { outputSpeech: { type: 'PlainText', text: 'Ask for a price.' } };
      res.ask(speech, reprompt);
    }
  };
}

type UberPrice = {
  localized_display_name: string;
  high_estimate: number;
  low_estimate: number;
  surge_multiplier: number;
}

function checkPrice(loc: GeocodeLoc): fetch.Promise {
  const baseURL = 'https://api.uber.com/v1/estimates/price';
  const params = queryString.stringify({
    start_latitude: 30.293858,
    start_longitude: -97.735285,
    end_latitude: loc.lat,
    end_longitude: loc.long
  });
  const headers = {authorization: 'Token <YOUR-UBER-API-TOKEN>'};
  const url = baseURL + '?' + params;
  console.log('Checking uber prices: ' + url);

  return fetch(url, {headers: headers})
    .then((res) => res.json())
    .then((json): Array<UberPrice> => {
      return json.prices;
    });
}

type GeocodeLoc = {
  lat: number;
  long: number;
  address: string;
  name: string;
}

function geocodeAddress(place: string): fetch.Promise {
  const hasCity = place.indexOf('Austin TX') !== -1;
  const fullAddress = hasCity ? place : place + ' Austin TX';
  const baseURL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
  const params = queryString.stringify({query: fullAddress, key: '<YOUR-GMAPS-API-KEY>'});

  const url = baseURL + '?' + params;
  console.log('Geocode Place search request: ' + url);
  return fetch(url)
    .then((res) => res.json())
    .then((data: Object) => {
      const result = data.results[0];
      return {
        name: result.name,
        address: result.formatted_address,
        lat: result.geometry.location.lat,
        long: result.geometry.location.lng,
      };
    });
}

exports.handler = (event: Event, ctx: Context): void => {
  var uberChecker = new UberChecker();
  uberChecker.execute(event, ctx);
};

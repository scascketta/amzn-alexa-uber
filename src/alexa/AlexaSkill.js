// @flow
import type {
  Slot,
  Card,
  Event,
  Intent,
  Context,
  Session,
  Reprompt,
  ResponseT,
  ResponseBody,
  OutputSpeech,
  LaunchRequest,
  IntentRequest,
  SessionStartedRequest,
  SessionEndedRequest,
} from './AlexaTypes';

type IntentHandler = (intent: Intent, session: Session, res: Response) => void;

export class AlexaSkill {
  _appId: string;
  // Flow syntax for specifying an object as a map {[key: keyType] : valueType}
  intentHandlers: {[name: string]: IntentHandler};

  constructor(appId : string) {
    this._appId = appId;
  };

  static speechOutputType = {
    PLAIN_TEXT: 'PlainText',
    SSML: 'SSML'
  };

  requestHandlers: {[name:string]: Function} = {
    LaunchRequest: (event: Event, ctx: Context, res: ResponseT): void => {
      this.eventHandlers.onLaunch.call(this, event.request, event.session, res);
    },
    IntentRequest: (event: Event, ctx: Context, res: ResponseT): void => {
      this.eventHandlers.onIntent.call(this, event.request, event.session, res);
    },
    SessionEndedRequest: (event: Event, ctx: Context): void => {
      this.eventHandlers.onSessionEnded(event.request, event.session);
      ctx.succeed();
    }
  };

  eventHandlers: {[name:string]: Function} = {
    onSessionStarted: (req: SessionStartedRequest, session: Session): void => { },
    onSessionEnded: (req: SessionEndedRequest, session: Session): void => { },
    onLaunch: (req: LaunchRequest, session: Session, res: Response): void => {
      throw "onLaunch should be overridden by subclass";
    },
    onIntent: (req: IntentRequest, session: Session, res: Response): void => {
      const intent = req.intent;
      const intentName = intent.name;
      const intentHandler = this.intentHandlers[intentName];
      if (intentHandler) {
        console.log('dispatch intent = ' + intentName);
        intentHandler.call(this, intent, session, res);
      } else {
        throw 'Unsupported intent = ' + intentName;
      }
    },
  };

  execute(event: Event, ctx: Context): void {
    try {
      console.log("session applicationId: " + event.session.application.applicationId);
      // Validate that this request originated from authorized source.
      if (this._appId && event.session.application.applicationId !== this._appId) {
          console.log("applicationIds don't match : " + event.session.application.applicationId + " and "
            + this._appId);
          throw "Invalid applicationId";
      }

      if (!event.session.attributes) {
          event.session.attributes = {};
      }

      if (event.session.new) {
          this.eventHandlers.onSessionStarted(event.request, event.session);
      }

      // Route the request to the proper handler which may have been overriden.
      let requestHandler = this.requestHandlers[event.request.type];
      requestHandler.call(this, event, ctx, new Response(ctx, event.session));
    } catch(e) {
      console.log("Unexpected exception " + e);
      ctx.fail(e);
    }
  };
}

type ResponseOptions = {
  session: Session,
  output: OutputSpeech,
  reprompt?: Reprompt,
  cardTitle?: string,
  cardContent?: string,
  shouldEndSession: bool,
};

export class Response {
  version: string;
  sessionAttributes: ?{[key:string]: Object};
  _context: Context;
  _session: Session;

  constructor(ctx: Context, session: Session) {
    this._context = ctx;
    this._session = session;
  };

  _buildSpeechletResponse(options: ResponseOptions): ResponseT {
    let card: Card;
    if (options.cardTitle && options.cardContent) {
      card = {
        type: "Simple",
        title: options.cardTitle,
        content: options.cardContent
      }
    }

    let resBody: ResponseBody = {
      outputSpeech: options.output,
      shouldEndSession: options.shouldEndSession,
      card: card,
      reprompt: options.reprompt,
    };

    let sessAttrs;
    if (options.session && options.session.attributes) {
      sessAttrs = options.session.attributes;
    }

    let res: ResponseT = {
      version: '1.0',
      response: resBody,
      sessionAttributes: sessAttrs,
    };

    return res;
  }

  tell(speech: OutputSpeech): void {
    this._context.succeed(this._buildSpeechletResponse({
      session: this._session,
      output: speech,
      shouldEndSession: true
    }));
  };

  tellWithCard(speech: OutputSpeech, cardTitle: string, cardContent: string): void {
    this._context.succeed(this._buildSpeechletResponse({
      session: this._session,
      output: speech,
      cardTitle: cardTitle,
      cardContent: cardContent,
      shouldEndSession: true,
    }));
  };

  ask(speech: OutputSpeech, reprompt: Reprompt): void {
    this._context.succeed(this._buildSpeechletResponse({
      session: this._session,
      output: speech,
      reprompt: reprompt,
      shouldEndSession: false,
    }));
  };

  askWithCard(speech: OutputSpeech, reprompt: Reprompt, cardTitle: string, cardContent: string): void {
    this._context.succeed(this._buildSpeechletResponse({
      session: this._session,
      output: speech,
      reprompt: reprompt,
      cardTitle: cardTitle,
      cardContent: cardContent,
      shouldEndSession: false,
    }));
  };
}

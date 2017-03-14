import * as React from "react";
import * as ReactDOM from "react-dom";
import "rxjs";
import {Observable} from "rxjs/Rx";
import {Epic, combineEpics, createEpicMiddleware} from "redux-observable";
import {combineReducers, createStore, applyMiddleware, compose, Dispatch} from "redux";
import {Provider, connect} from "react-redux";

// Constants
const PING = "PING";
const PONG = "PONG";

// Actions
const ping = () => ({ type: PING });
const pong = () => ({ type: PONG });

// Epics
const pingEpic: Epic<any, any> = action$ =>
    action$.ofType(PING)
        .delay(1000)
        .mapTo(pong());

const epic = combineEpics(
  pingEpic,
);

// Reducers
const pingReducer = (state = { isPinging: false }, action) => {
  switch (action.type) {
    case PING:
      return { isPinging: true };
    case PONG:
      return { isPinging: false };
    default:
      return state;
  }
};

// Components
interface PingProps { isPinging?: boolean; };

export const PingView = (props: PingProps) => {
  return <h1>This is {props.isPinging ? "" : "not "} pinging</h1>;
};

// Containers

const Ping = connect(
  (state) => ({isPinging: state.ping.isPinging}),
)(PingView);

const PingButton = connect(
  () => ({}),
  (dispatch, props) => ({onClick: () => dispatch(ping())})
)(({onClick}) =>
  <button onClick={onClick}>PING</button>
);

const App = () => <div>
  <Ping />
  <PingButton />
</div>;

// Main
const reducer = combineReducers({
  ping: pingReducer,
});

const epicMiddleware = createEpicMiddleware(epic);

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(reducer, composeEnhancers(
  applyMiddleware(epicMiddleware),
));

ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById("app"),
);

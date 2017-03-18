import * as React from "react";
import * as ReactDOM from "react-dom";
import "rxjs";
import { Observable } from "rxjs/Rx";
import { ErrorObservable } from "rxjs/observable/ErrorObservable";
import { Epic, combineEpics, createEpicMiddleware } from "redux-observable";
import { combineReducers, createStore, applyMiddleware, compose, Dispatch } from "redux";
import { Provider, connect } from "react-redux";
import { createAction } from "redux-actions";
import createHistory from "history/createHashHistory";
import { Route } from "react-router";
import { Link } from "react-router-dom";
import { ConnectedRouter, routerReducer, routerMiddleware, push } from "react-router-redux";

// my API
function checkStatus(response: Response): Observable<Response> | ErrorObservable {
    if (response.status >= 200 && response.status < 300) {
        return Observable.from(response.json());
    } else {
        const error = new Error(response.statusText);
        return Observable.throw(error);
    }
}

function parseJSON(response: Response): Observable<{}> {
    return Observable.from(response.json());
}

export function API(request: Request | string): Observable<{}> {
    return Observable.fromPromise(fetch(request))
        .mergeMap(checkStatus)
        ;
}

// Constants
const PING = "PING";
const PONG = "PONG";
const FETCH_USER = "FETCH_USER";
const FETCH_USER_FULFILLED = "FETCH_USER_FULFILLED";
const ERROR_FETCH_USER = "ERROR_FETCH_USER";
const INCREMENT = "INCREMENT";
const INCREMENT_IF_ODD = "INCREMENT_IF_ODD";

// Actions
const ping = () => ({ type: PING });
const pong = () => ({ type: PONG });
const fetchUser = (username: string) => ({ type: FETCH_USER, payload: username });
const fetchUserFulfilled = payload => ({ type: FETCH_USER_FULFILLED, payload });
const errorFetchUser = error => ({ type: ERROR_FETCH_USER, error });
const increment = () => ({ type: INCREMENT });
const incrementIfOdd = () => ({ type: INCREMENT_IF_ODD });

// Epics
const pingEpic: Epic<any, any> = action$ =>
    action$.ofType(PING)
        .delay(1000)
        .mapTo(pong())
    ;

const fetchUserEpic = action$ =>
    action$.ofType(FETCH_USER)
        .mergeMap(action =>
            // ajax.getJSON(`https://api.github.com/users/${action.payload}`)
            // rxFetch(`https://api.github.com/users/${action.payload}`)
            //   .json()
            API(`https://api.github.com/users/${action.payload}`)
                .map(response => fetchUserFulfilled(response))
                .catch(error => Observable.of(errorFetchUser(error)))
        )
    ;

const incrementIfOddEpic = (action$, store) =>
    action$.ofType(INCREMENT_IF_ODD)
        .filter(() => store.getState().counter % 2 === 1)
        .mapTo(increment())
    ;

const urls = ["/", "/counter", "/user/uzimith", "/user/facebook"];

const transitionEpic = () =>
    Observable.interval(3000)
        .map(i => push(urls[i % urls.length]))
        .take(0)
    ;

const epic = combineEpics(
    pingEpic,
    fetchUserEpic,
    incrementIfOddEpic,
    transitionEpic,
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

const usersReducer = (state = {}, action) => {
    switch (action.type) {
        case FETCH_USER:
            return {
                ...state,
                _currentUser: action.payload,
                _error: null,
            };
        case FETCH_USER_FULFILLED:
            return {
                ...state,
                [action.payload.login]: action.payload, // `login` is the username
                _error: null,
            };
        case ERROR_FETCH_USER:
            return {
                ...state,
                _error: action.error,
            };
        default:
            return state;
    }
};

const counterReducer = (state = 0, action) => {
    switch (action.type) {
        case INCREMENT:
            return state + 1;

        default:
            return state;
    }
};

const reducer = combineReducers({
    ping: pingReducer,
    users: usersReducer,
    counter: counterReducer,
    router: routerReducer,
});

// Components
interface PingProps { isPinging?: boolean; };
const PingText = (props: PingProps) => {
    return <h1>This is {props.isPinging ? "" : "not "} pinging</h1>;
};

interface UserProps { user: {}; };
class UserCode extends React.Component<UserProps, {}> {
    static defaultProps: Partial<UserProps> = {
        user: {}
    };

    render() {
        return <div><code>{JSON.stringify(this.props.user)}</code></div>;
    }
}

class InputForm extends React.Component<{
    input?: string;
    error?: Error;
    sendInput: (input: string) => void;
}, { value: string }
    > {
    constructor(props) {
        super(props);
        this.state = { value: props.input || "redux-observable" };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.input !== this.props.input) {
            this.setState({ value: nextProps.input });
        }
    }

    handleChange = event => {
        this.setState({ value: event.target.value });
    }

    handleSubmit = event => {
        event.preventDefault();
        this.props.sendInput(this.state.value);
    }

    render() {
        const errorMessage = this.props.error ? <span>{this.props.error.message}</span> : null;
        return <form onSubmit={this.handleSubmit}>
            <input value={this.state.value} onChange={this.handleChange} />
            <input type="submit" value="submit" />
            {errorMessage}
        </form>;
    }
}

const Button = ({ text, handleClick }) => <button onClick={handleClick}>{text}</button>;

// Containers

const PingView = connect(
    (state) => ({ isPinging: state.ping.isPinging }),
)(PingText);

const PingButton = connect(
    () => ({ text: "ping" }),
    (dispatch, props) => ({ handleClick: () => dispatch(ping()) })
)(Button);

const UserView = connect(
    (state, props) => ({ user: state.users[state.users._currentUser] }),
)(UserCode);

const FetchUserForm = connect(
    (state, props) => ({ input: props.username, error: state.users._error }),
    (dispatch, props) => ({ sendInput: (username: string) => dispatch(fetchUser(username)) })
)(InputForm);

const IncrementButton = connect(
    () => ({ text: "Increment" }),
    (dispatch, props) => ({ handleClick: () => dispatch(increment()) })
)(Button);

const IncrementIfOddButton = connect(
    () => ({ text: "IncrementIfOdd" }),
    (dispatch, props) => ({ handleClick: () => dispatch(incrementIfOdd()) })
)(Button);

const Ping = () => (
    <div>
        <PingView />
        <PingButton />
    </div>
);

const User = ({ match }) => (
    <div>
        <UserView />
        <FetchUserForm username={match.params.id} />
    </div>
);

const Counter = () => (
    <div>
        <IncrementButton />
        <IncrementIfOddButton />
    </div>
);

const App = () => <div>
    <Route exact path="/" component={Ping} />
    <Route path="/user/:id" component={User} />
    <Route path="/counter" component={Counter} />
    <ul>
        <li><Link to="/user/uzimith">uzimith</Link></li>
        <li><Link to="/user/uzimith2">uzimith2</Link></li>
    </ul>
</div>;

// Main
const history = createHistory();
const historyMiddleware = routerMiddleware(history);
const epicMiddleware = createEpicMiddleware(epic);

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(reducer, composeEnhancers(
    applyMiddleware(historyMiddleware, epicMiddleware),
));

ReactDOM.render(
    <Provider store={store}>
        <ConnectedRouter history={history}>
            <App />
        </ConnectedRouter>
    </Provider>,
    document.getElementById("app"),
);

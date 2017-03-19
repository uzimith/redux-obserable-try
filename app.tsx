import * as React from "react";
import * as ReactDOM from "react-dom";
import "rxjs";
import { Observable } from "rxjs/Rx";
import { ErrorObservable } from "rxjs/observable/ErrorObservable";
import { Epic, combineEpics, createEpicMiddleware, ActionsObservable } from "redux-observable";
import { combineReducers, createStore, applyMiddleware, compose, Dispatch } from "redux";
import { Provider, connect } from "react-redux";
import actionCreatorFactory, { isType, Action, ActionCreator } from "typescript-fsa";
import createHistory from "history/createHashHistory";
import { Route, Router } from "react-router";
import { Link } from "react-router-dom";
import { ConnectedRouter, routerReducer, RouterState, routerMiddleware, push } from "react-router-redux";
import returnof from "returnof";

// my API
export class ResponseError extends Error {
    public response;
    constructor(response: Response) {
        super(response.statusText);
        this.response = response;
    }
}

function checkStatus(response: Response): Observable<Response> | ErrorObservable {
    if (response.status >= 200 && response.status < 300) {
        return Observable.from(response.json());
    } else {
        return Observable.throw(new ResponseError(response));
    }
}

export function API(request: Request | string): Observable<any> {
    return Observable.fromPromise(fetch(request))
        .mergeMap(checkStatus)
        ;
}

// Interface
interface User { // GitHub API User
    login: string; // username
    id: number;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
    name: string;
    company: string;
    blog: string;
    location: string;
    email: string;
    hireable: boolean;
    bio?: any;
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
    created_at: Date | string;
    updated_at: Date | string;
}

// Actions
const actionCreator = actionCreatorFactory();
const ping = actionCreator("PING");
const pong = actionCreator("PONG");

const fetchUser = actionCreator.async<string, User, ResponseError>("FETCH_USER");
const increment = actionCreator("INCREMENT");
const incrementIfOdd = actionCreator("INCREMENT_IF_ODD");

// Reducers
interface PingState {
    isPinging: boolean;
}
const pingReducer = (state: PingState = { isPinging: false }, action: Action<any>): PingState => {
    switch (action.type) {
        case ping.type:
            return { isPinging: true };
        case pong.type:
            return { isPinging: false };
        default:
            return state;
    }
};

interface UsersState {
    _currentUser?: string;
    _error?: ResponseError;
    [username: string]: User | any;
}

const usersReducer = (state: UsersState = {}, action: Action<any>): UsersState => {
    if (isType(action, fetchUser.started)) {
        return {
            ...state,
            _currentUser: action.payload,
            _error: null,
        };
    }
    if (isType(action, fetchUser.done)) {
        return {
            ...state,
            [action.payload.result.login]: action.payload.result,
            _error: null,
        };
    }
    if (isType(action, fetchUser.failed)) {
        return {
            ...state,
            _error: action.payload.error
        };
    }
    return state;
};

type CounterState = number;

const counterReducer = (state: CounterState = 0, action: Action<any>): CounterState => {
    if (isType(action, increment)) {
        return state + 1;
    }
    return state;
};

interface State {
    ping: PingState;
    users: UsersState;
    counter: CounterState;
    router: RouterState;
};

const reducer = combineReducers<State>({
    ping: pingReducer,
    users: usersReducer,
    counter: counterReducer,
    router: routerReducer,
});

// Epics
const PingValue = returnof(ping);
const pingEpic: Epic<typeof PingValue, PingState> = action$ =>
    action$.ofType(ping.type)
        .delay(1000)
        .mapTo(pong())
    ;

const FetchUserValue = returnof(fetchUser.started);
const fetchUserEpic: Epic<typeof FetchUserValue, UsersState> = action$ =>
    action$.ofType(fetchUser.started.type)
        .mergeMap(action => API(`https://api.github.com/users/${action.payload}`)
            .map(response => fetchUser.done({ params: action.payload, result: response }))
            .catch(error => Observable.of(fetchUser.failed({ params: action.payload, error })))
        )
    ;

const IncrementValue = returnof(increment);
const incrementIfOddEpic: Epic<typeof IncrementValue, CounterState> = (action$, store) =>
    action$.ofType(incrementIfOdd.type)
        .filter(() => store.getState() % 2 === 1)
        .mapTo(increment())
    ;

const urls = ["/", "/counter", "/user/uzimith", "/user/facebook"];

const transitionEpic = () =>
    Observable.interval(10000)
        .map(i => push(urls[i % urls.length]))
    ;

let epic = combineEpics<Epic<Action<any>, any>>(
    pingEpic,
    fetchUserEpic,
    incrementIfOddEpic,
    transitionEpic,
);

// Components
interface PingProps { isPinging?: boolean; };
const PingText = (props: PingProps) => {
    return <h1>This is {props.isPinging ? "" : "not "} pinging</h1>;
};

interface UserProps { user: User | {}; };
class UserCode extends React.Component<UserProps, {}> {

    static defaultProps: UserProps = {
        user: {}
    };

    render() {
        return <div><code>{JSON.stringify(this.props.user)}</code></div>;
    }
}

interface InputFormProps {
    input?: string;
    error?: Error;
    sendInput: (input: string) => any;
}

interface InputFormState {
    value: string;
}

class InputForm extends React.Component<InputFormProps, InputFormState> {

    state: InputFormState = {
        value: this.props.input || "redux-observable"
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.input !== this.props.input) {
            this.setState({ value: nextProps.input });
        }
    }

    handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ value: event.target.value });
    }

    handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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

interface ButtonProps {
    text: string;
    handleClick: (event?: React.MouseEvent<HTMLButtonElement>) => any;
}
const Button = ({ text, handleClick }: ButtonProps) => <button onClick={handleClick}>{text}</button>;

// Containers

const PingView = connect<PingProps, void>(
    (state: State) => ({ isPinging: state.ping.isPinging }),
)(PingText);

const PingButton = connect<ButtonProps, void>(
    () => ({ text: "ping" }),
    (dispatch, props) => ({ handleClick: () => dispatch(ping()) })
)(Button);

const UserView = connect<UserProps, void>(
    (state: State, props) => ({ user: state.users[state.users._currentUser] }),
)(UserCode);

interface FetchUserFormProps {
    username: string;
}

const FetchUserForm = connect<InputFormProps, FetchUserFormProps>(
    (state: State, props) => ({ input: props.username, error: state.users._error }),
    (dispatch, props) => ({ sendInput: (username: string) => dispatch(fetchUser.started(username)) })
)(InputForm);

const IncrementButton = connect<ButtonProps, void>(
    () => ({ text: "Increment" }),
    (dispatch, props) => ({ handleClick: () => dispatch(increment()) })
)(Button);

const IncrementIfOddButton = connect<ButtonProps, void>(
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

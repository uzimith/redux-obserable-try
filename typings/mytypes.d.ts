import { Component } from "react";
import { ActionsObservable } from "redux-observable";
import { MiddlewareAPI } from "redux";
import { Observable } from "rxjs/Observable";

declare module "react-redux" {
    export function connect<TStateProps, TOwnProps>(
        mapStateToProps?: MapStateToProps<Partial<TStateProps>, TOwnProps>,
        mapDispatchToProps?:
            MapDispatchToPropsFunction<Partial<TStateProps>, TOwnProps> | Partial<TStateProps>,
        mergeProps?: MergeProps<Partial<TStateProps>, Partial<TStateProps>, TOwnProps>,
        options?: Options
    ): ComponentDecorator<TStateProps, TOwnProps>;
}

declare module "redux-observable" {
    export interface Epic<T, S> {
        (action$: ActionsObservable<T>, store: MiddlewareAPI<S>): Observable<any>;
    }
}

declare module "react-router/lib/Route" {
    export interface RouteProps {
        exact?: boolean;
        component: ({ }) => JSX.Element;
    }
}

declare module "react-router-redux" {
    export class ConnectedRouter extends Component<{
        history: {};
    }, any> {
        render(): JSX.Element;
    }
    export interface RouterState {
        location: {
            pathname: string;
            search: string;
            hash: string;
        };
    }
}

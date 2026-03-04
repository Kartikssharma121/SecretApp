import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(name, params);
    }
}

export function reset(routes, index = 0) {
    if (navigationRef.isReady()) {
        navigationRef.reset({
            index,
            routes: routes.map((route) => ({ name: route })),
        });
    }
}

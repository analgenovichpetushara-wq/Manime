import 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { registerRootComponent } from 'expo';

// Keep the native splash controlled from the earliest bootstrap point.
// App is loaded only after this call so module-evaluation failures cannot
// prevent the splash policy from being registered.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Use require intentionally here: unlike a static ESM import, this executes
// only after the splash bootstrap above.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const App = require('./src/App').default;

registerRootComponent(App);

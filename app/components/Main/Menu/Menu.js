import React, {Component} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import {withNamespaces} from 'react-i18next';
import {Icon, Avatar} from 'react-native-elements';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-community/async-storage';
import i18n from '../../../utils/i18n';
import RNRestart from 'react-native-restart';
import {getLanguageCode} from '../../../helpers';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {
  AccessToken,
  LoginManager,
  GraphRequest,
  GraphRequestManager,
} from 'react-native-fbsdk';
import globals from '../../globals';
import {GoogleSignin, statusCodes} from '@react-native-community/google-signin';
import {domain} from '../../../constants/urlDefine';

class Menu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      languageCode: 'ja',
      isSignedInGoogle: false,
      isSignedIn: false,
      user: null,
    };
    this.googleSignInConfigure();
    globals.onSignIn = this.onSignIn.bind(this);
  }

  onSignIn = (user, isSignedIn, isSignedInGoogle) => {
    this.setState({user, isSignedIn, isSignedInGoogle});
  };

  /**
    Change language and save language code to AsyncStorage
    @param string
   */
  async onChangeLanguage(lang) {
    i18n.changeLanguage(lang);
    try {
      await AsyncStorage.setItem('@languageCode', lang);
    } catch (error) {
      this.setState({languageCode: 'ja'});
    }
    RNRestart.Restart();
  }

  // show check on select language
  showChecked = lng => {
    if (this.state.languageCode !== lng) {
      return null;
    }
    return (
      <View style={styles.checkIcon}>
        <Icon name="check" color="#00557F" />
      </View>
    );
  };

  componentDidMount() {
    getLanguageCode()
      .then(res => this.setState({languageCode: res}))
      .catch(() => this.setState({languageCode: 'ja'}));
  }

  /**
    It is mandatory to call this method before attempting to call signIn() and signInSilently()
 */
  googleSignInConfigure = () => {
    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      webClientId:
        '831086411403-vl8s60r47p5fca9a196qm493p3ua5ttl.apps.googleusercontent.com',
    });
  };

  /**
  Handle login with facebook
  */
  loginFacebook = async () => {
    const {t} = this.props;
    try {
      LoginManager.logInWithPermissions(['public_profile']).then(result => {
        if (result.isCancelled) {
          this.showSignInError('Login cancelled');
        } else {
          this.getProfileFaceBook();
        }
      });
    } catch (error) {
      this.showSignInError(t('auth:An error occurred. Please try again later'));
    }
  };

  /**
    get signed user info from facebook
  */
  getProfileFaceBook = () => {
    const {t} = this.props;
    AccessToken.getCurrentAccessToken()
      .then(profile => {
        return profile;
      })
      .then(profile => {
        const responseInfoCallback = (error, response) => {
          if (error) {
            this.showSignInError(
              t('auth:An error occurred. Please try again later'),
            );
          } else {
            this.setState({user: response, isSignedIn: true});
            this.fetchLoginedUser(profile.accessToken, 'facebook');
          }
        };
        if (profile) {
          const infoRequest = new GraphRequest(
            '/me',
            {
              accessToken: profile.accessToken,
              parameters: {
                fields: {
                  string: 'email,name,first_name,last_name,picture.type(large)',
                },
              },
            },
            responseInfoCallback,
          );
          // Start the graph request.
          new GraphRequestManager().addRequest(infoRequest).start();
        }
      });
  };

  /**
    Handle login with facebook
   */
  loginGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      this.setState({
        user: response.user,
        isSignedIn: true,
        isSignedInGoogle: true,
      });
      this.fetchLoginedUser(response.idToken, 'google');
    } catch (error) {
      this.handleSignInError(error);
    }
  };

  /**
  fetch logined user to api (save database)
  @param string socialToken, provider
  @return object
 */
  fetchLoginedUser = async (socialToken, provider) => {
    let data = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        social_token: socialToken,
      }),
    };

    return await fetch(`${domain}/api/auth/login/${provider}`, data)
      .then(response => response.json())
      .then(responseJson => {
        return responseJson;
      });
  };

  /**
    handle error when login with google fail
    @param error the SignIn error object
   */
  handleSignInError = async error => {
    const {t} = this.props;
    if (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        this.showSignInError('User cancelled the login flow.');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        this.showSignInError('Sign in is in progress.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        await this.getGooglePlayServices();
      } else {
        this.showSignInError(
          t('auth:An error occurred. Please try again later'),
        );
      }
    } else {
      this.showSignInError(t('auth:An error occurred. Please try again later'));
    }
  };

  /**
  Checks if device has Google Play Services installed
 */
  getGooglePlayServices = async () => {
    const {t} = this.props;
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    } catch (error) {
      this.showSignInError(t('auth:Google play services are not available'));
    }
  };

  /**
    show error when sign in failed
    @param string message
   */
  showSignInError = message => {
    const {t} = this.props;
    Alert.alert(t('auth:Signin error'), message, [{text: 'OK'}], {
      cancelable: false,
    });
  };

  /**
    Handle logout
   */
  logout = async () => {
    const {t} = this.props;
    Alert.alert(
      t('auth:logout'),
      t('auth:do you want to logout'),
      [
        {text: t('auth:cancle'), style: 'cancel'},
        {
          text: t('auth:ok'),
          onPress: () => {
            const {isSignedInGoogle} = this.state;
            if (isSignedInGoogle) {
              this.logoutGoogle();
            } else {
              this.logoutFaceBook();
            }
          },
        },
      ],
      {cancelable: false},
    );
  };

  /**
    logout with facebook
   */
  logoutFaceBook = () => {
    LoginManager.logOut();
    this.setState({
      user: null,
      isSignedIn: false,
      isSignedInGoogle: false,
    });
  };

  /**
    logout with google
   */
  logoutGoogle = async () => {
    try {
      // await GoogleSignin.revokeAccess(); //Removes your application from the user authorized applications.
      await GoogleSignin.signOut();
      this.setState({
        user: null,
        isSignedIn: false,
        isSignedInGoogle: false,
      });
    } catch (error) {
      this.showSignInError(JSON.stringify(error));
    }
  };

  render() {
    const {
      container,
      menuItem,
      menuText,
      menuBanner,
      logoMenu,
      avatar,
      menuWrapper,
      text,
      ensignIcon,
      loginButton,
      button,
      loginButtonTitle,
      divider,
    } = styles;
    const {t} = this.props;
    const {user, isSignedIn} = this.state;

    let facebookButtonJSX = (
      <FontAwesome.Button
        name="facebook"
        style={button}
        backgroundColor="#3A63BF"
        onPress={this.loginFacebook}>
        <Text style={loginButtonTitle}>{t('auth:login with facebook')}</Text>
      </FontAwesome.Button>
    );
    let googleButtonJSX = (
      <FontAwesome.Button
        name="google"
        style={button}
        backgroundColor="#C94131"
        onPress={this.loginGoogle}>
        <Text style={loginButtonTitle}>{t('auth:login with google')}</Text>
      </FontAwesome.Button>
    );
    let logoutJSX = (
      <FontAwesome.Button
        name="sign-out"
        backgroundColor="#FFF"
        color="#545659"
        onPress={this.logout}>
        <Text style={menuText}>{t('auth:logout')}</Text>
      </FontAwesome.Button>
    );

    facebookButtonJSX = !isSignedIn ? facebookButtonJSX : null;
    googleButtonJSX = !isSignedIn ? googleButtonJSX : null;
    logoutJSX = isSignedIn ? logoutJSX : null;
    var avatarUrl;
    if (user && user.photo) {
      avatarUrl = user.photo;
    } else if (user && user.picture) {
      avatarUrl = user.picture.data.url;
    }
    const avatarJSX = (
      <Avatar size="medium" rounded style={avatar} source={{uri: avatarUrl}} />
    );
    const logoJSX = (
      <Image style={logoMenu} source={require('../../../images/LOGO.png')} />
    );

    return (
      <View style={container}>
        <LinearGradient
          start={{x: 0.0, y: 0.25}}
          end={{x: 1, y: 3.0}}
          locations={[0, 0.5, 0.6]}
          colors={['#FFF', '#36C075', '#7ED0A3']}
          style={menuBanner}>
          {user ? avatarJSX : logoJSX}
          <Text style={text}>{user ? user.name : 'MENU JP FOOD'}</Text>
          <Text style={text}>{user ? '' : 'レストランメニュー'}</Text>
        </LinearGradient>
        <View style={menuWrapper}>
          <TouchableOpacity
            style={menuItem}
            onPress={() => this.onChangeLanguage('ja')}>
            <Image
              style={ensignIcon}
              source={require('../../../images/icon/japan.png')}
            />
            <Text style={menuText}>{t('language_setting:japanese')}</Text>
            {this.showChecked('ja')}
          </TouchableOpacity>
          <TouchableOpacity
            style={menuItem}
            onPress={() => this.onChangeLanguage('vi')}>
            <Image
              style={ensignIcon}
              source={require('../../../images/icon/vietnam.png')}
            />
            <Text style={menuText}>{t('language_setting:vietnamese')}</Text>
            {this.showChecked('vi')}
          </TouchableOpacity>
          <TouchableOpacity
            style={menuItem}
            onPress={() => this.onChangeLanguage('en')}>
            <Image
              style={ensignIcon}
              source={require('../../../images/icon/united-kingdom.png')}
            />
            <Text style={menuText}>{t('language_setting:english')}</Text>
            {this.showChecked('en')}
          </TouchableOpacity>
          {logoutJSX}
        </View>
        <View style={loginButton}>
          {facebookButtonJSX}
          <View style={divider} />
          {googleButtonJSX}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 10,
  },
  menuBanner: {
    flex: 2,
    paddingVertical: 40,
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuWrapper: {
    flex: 4,
  },
  menuItem: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    padding: 10,
  },
  checkIcon: {
    flex: 2,
  },
  menuText: {
    paddingLeft: 10,
    paddingVertical: 5,
    flex: 8,
  },
  logoMenu: {
    width: 80,
    height: 80,
    marginBottom: 10,
    resizeMode: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  text: {
    paddingTop: 3,
    color: '#575A63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ensignIcon: {
    flex: 1,
    width: 25,
    height: 20,
  },
  loginButton: {
    flex: 5,
    marginHorizontal: 20,
  },
  button: {
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonTitle: {
    fontSize: 16,
    color: 'white',
  },
  divider: {
    height: 5,
  },
});

export default withNamespaces(['language_setting', 'auth'], {wait: true})(Menu);

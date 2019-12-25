import React, {Component} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, {PROVIDER_GOOGLE, Marker, Callout} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import {request, PERMISSIONS} from 'react-native-permissions';
import locale from 'react-native-locale-detector';
import AsyncStorage from '@react-native-community/async-storage';
import listRestaurantsVI from '../../../../api/restaurants/restaurants_vi';
import listRestaurantsEN from '../../../../api/restaurants/restaurants_en';
import listRestaurantsJA from '../../../../api/restaurants/restaurants_ja';

const {width, height} = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATTITUDE_DELTA = 0.012;
const LONGTITUDE_DELTA = LATTITUDE_DELTA * ASPECT_RATIO;

class Maps extends Component {
  constructor(props) {
    super(props);
    this.state = {
      listRestaurants: [],
      marginTop: 0,
      languageCode: '',
    };
  }

  // get language saved AsyncStorage
  getStorangeValue = async () => {
    try {
      const value = await AsyncStorage.getItem('@languageCode');
      if (value !== null) {
        this.setState({
          languageCode: value,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  getListRestaurants = () => {
    let listRestaurants = listRestaurantsJA;
    let {languageCode} = this.state;
    let lng = languageCode;
    if (languageCode === '') {
      lng = locale.substr(0, 2);
    }
    if (lng === 'vi') {
      listRestaurants = listRestaurantsVI;
    }
    if (lng === 'en') {
      listRestaurants = listRestaurantsEN;
    }
    this.setState({
      listRestaurants: listRestaurants,
    });
  };

  async componentDidMount() {
    setTimeout(() => this.setState({marginTop: -1}), 500);
    this.requestLocationPermission();
    await this.getStorangeValue();
    this.getListRestaurants();
  }

  requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      let response = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      if (response === 'granted') {
        this.locateCurrentPosition();
      }
    } else {
      let response = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      if (response === 'granted') {
        this.locateCurrentPosition();
      }
    }
  };

  locateCurrentPosition = () => {
    Geolocation.getCurrentPosition(
      position => {
        let initialPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: LATTITUDE_DELTA,
          longitudeDelta: LONGTITUDE_DELTA,
        };
        this.setState({initialPosition});
      },
      error => Alert.alert(error.message),
      {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000},
    );
  };

  render() {
    const {container, imageMarker, titleMarker} = styles;
    const {navigation} = this.props;
    return (
      <View style={container}>
        <MapView
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          style={{
            ...StyleSheet.absoluteFillObject,
            marginTop: this.state.marginTop,
          }}
          initialRegion={this.state.initialPosition}>
          {this.state.listRestaurants.map(restaurant => (
            <Marker
              key={restaurant.id}
              coordinate={{
                latitude: restaurant.latitude,
                longitude: restaurant.longitude,
              }}>
              <Image
                style={imageMarker}
                source={require('../../../images/LOGO.png')}
                tintColor="#DD3624"
              />
              <Callout
                onPress={() =>
                  navigation.navigate('MenuFoodsScreen', {restaurant})
                }>
                <Text style={titleMarker}>{restaurant.name}</Text>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  imageMarker: {
    width: 40,
    height: 40,
    resizeMode: 'center',
  },
  titleMarker: {
    fontSize: 16,
    width: 200,
    fontWeight: 'bold',
  },
});

export default Maps;

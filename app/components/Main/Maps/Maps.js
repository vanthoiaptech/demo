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
import listRestaurants from '../../../../api/restaurants';

const {width, height} = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATTITUDE_DELTA = 0.0922;
const LONGTITUDE_DELTA = LATTITUDE_DELTA * ASPECT_RATIO;

class Maps extends Component {
  constructor(props) {
    super(props);
    this.state = {
      listRestaurants,
    };
  }

  componentDidMount() {
    this.requestLocationPermission();
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
      {enableHighAccuracy: true, timeout: 10000, maximumAge: 1000},
    );
  };

  render() {
    const {container, map, imageMarker, titleMarker} = styles;
    const {navigation} = this.props;
    return (
      <View style={container}>
        <MapView
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          style={map}
          initialRegion={this.state.initialPosition}>
          {this.state.listRestaurants.map(marker => (
            <Marker
              key={marker.id}
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}>
              <Image
                style={imageMarker}
                source={require('../../../images/icon/marker.png')}
              />
              <Callout onPress={() => navigation.navigate('MenuFoodsScreen')}>
                <Text style={titleMarker}>{marker.name}</Text>
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
  map: {
    ...StyleSheet.absoluteFillObject,
    left: 0,
    right: 0,
  },
  imageMarker: {
    width: 50,
    height: 50,
  },
  titleMarker: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Maps;
import {useEffect, useState} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import Svg, {Rect, Text} from 'react-native-svg';
import {Camera, CameraType, FaceDetectionResult} from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import * as saffe from '@melon-technologies/get-face-status';

export default function App() {
  const [status, setStatus] = useState<saffe.Status>(saffe.FaceStatus.NO_FACE);
  const [face, setFace] = useState<saffe.Face | null>(null);

  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  const [permission, requestPermission] = Camera.useCameraPermissions();

  useEffect(() => {
    requestPermission();
  }, []);

  if (!permission?.granted) {
    return;
  }

  const handleFacesDetected = ({faces}: FaceDetectionResult) => {
    const shape = {width: windowWidth, height: windowHeight};
    const options = {detectorType: 'expo', selfieMode: true};
    const {status, face} = saffe.getFaceStatus(faces, shape, options);
    setStatus(status);
    setFace(face);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Camera
        style={StyleSheet.absoluteFill}
        type={CameraType.front}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.none,
          minDetectionInterval: 100,
        }}
      />
      <Svg style={StyleSheet.absoluteFill}>
        <Text y="15" fontSize="15" fill="white">
          {status.text}
        </Text>
        {face?.box && (
          <Rect
            stroke="blue"
            strokeWidth="4"
            fill="none"
            x={face.box.xMin}
            y={face.box.yMin}
            width={face.box.xMax - face.box.xMin}
            height={face.box.yMax - face.box.yMin}
          />
        )}
      </Svg>
    </View>
  );
}

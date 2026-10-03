import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { DexTheme } from '../constants/dexTheme';
import { useDexStore } from '../store/dexStore';
import { Ionicons } from '@expo/vector-icons';

interface DexHeaderProps {
  onSettingsPress?: () => void;
  title?: string;
}

export const DexHeader: React.FC<DexHeaderProps> = ({
  onSettingsPress,
  title = 'ZOODEX · SCANNER',
}) => {
  const { isOnline, isScanning } = useDexStore();
  const glowAnim = useRef(new Animated.Value(1)).current;
  const yellowBlinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.3,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1.0,
            duration: 350,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(yellowBlinkAnim, { toValue: 0.2, duration: 180, useNativeDriver: true }),
          Animated.timing(yellowBlinkAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glowAnim.setValue(1);
      yellowBlinkAnim.setValue(1);
    }
  }, [isScanning]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Optical Sensor Aperture */}
        <View style={styles.lensBorder}>
          <Animated.View
            style={[
              styles.lensInner,
              {
                transform: [{ scale: glowAnim }],
              },
            ]}>
            <View style={styles.lensReflection} />
            <View style={styles.lensCore} />
          </Animated.View>
        </View>

        {/* 3 Status Indicator LEDs */}
        <View style={styles.ledContainer}>
          <View style={[styles.led, styles.ledRed]}>
            <View style={styles.ledGlint} />
          </View>

          <Animated.View
            style={[
              styles.led,
              styles.ledYellow,
              { opacity: isScanning ? yellowBlinkAnim : 0.7 },
            ]}>
            <View style={styles.ledGlint} />
          </Animated.View>

          <View style={[styles.led, isOnline ? styles.ledGreen : styles.ledDim]}>
            <View style={styles.ledGlint} />
          </View>
        </View>

        {/* Center Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>BIO-SCANNER SISTEMA ATTIVO</Text>
        </View>

        {/* Settings Action Button */}
        {onSettingsPress && (
          <TouchableOpacity
            onPress={onSettingsPress}
            style={styles.settingsBtn}
            activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Cybernetic Bevel Separator */}
      <View style={styles.bevelBar}>
        <View style={styles.bevelLine} />
        <View style={styles.bevelDot} />
        <View style={styles.bevelLine} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: DexTheme.colors.pokedexRed,
    borderBottomWidth: 3,
    borderBottomColor: DexTheme.colors.pokedexRedDeep,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lensBorder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  lensInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DexTheme.colors.lensBlue,
    borderWidth: 1.5,
    borderColor: DexTheme.colors.lensBlueDeep,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lensCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0284C7',
  },
  lensReflection: {
    position: 'absolute',
    top: 5,
    left: 6,
    width: 12,
    height: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    transform: [{ rotate: '-35deg' }],
  },
  ledContainer: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  led: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  ledRed: {
    backgroundColor: DexTheme.colors.ledRed,
  },
  ledYellow: {
    backgroundColor: DexTheme.colors.ledYellow,
  },
  ledGreen: {
    backgroundColor: DexTheme.colors.ledGreen,
  },
  ledDim: {
    backgroundColor: '#64748B',
  },
  ledGlint: {
    position: 'absolute',
    top: 1,
    left: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerSub: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  settingsBtn: {
    backgroundColor: DexTheme.colors.pokedexRedDark,
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  bevelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  bevelLine: {
    flex: 1,
    height: 2,
    backgroundColor: DexTheme.colors.pokedexRedDeep,
    borderRadius: 1,
  },
  bevelDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00E5FF',
  },
});

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { DexTheme } from '../constants/dexTheme';
import { useDexStore } from '../store/dexStore';
import { Ionicons } from '@expo/vector-icons';

interface DexHeaderProps {
  onSettingsPress?: () => void;
  title?: string;
}

export const DexHeader: React.FC<DexHeaderProps> = ({ onSettingsPress, title = 'ZOODEX v1.0' }) => {
  const { isOnline, isScanning, batterySaver } = useDexStore();
  const glowAnim = useRef(new Animated.Value(1)).current;
  const yellowBlinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.5,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.9,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(yellowBlinkAnim, { toValue: 0.2, duration: 200, useNativeDriver: true }),
          Animated.timing(yellowBlinkAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glowAnim.setValue(1);
      yellowBlinkAnim.setValue(1);
    }
  }, [isScanning]);

  return (
    <View style={styles.container}>
      {/* Upper Bezel */}
      <View style={styles.topRow}>
        {/* Large Sensor Lens (Blue Eye of the Pokedex) */}
        <View style={styles.lensBorder}>
          <Animated.View
            style={[
              styles.lensInner,
              {
                transform: [{ scale: glowAnim }],
              },
            ]}>
            {/* Glass reflection highlight */}
            <View style={styles.lensReflection} />
            <View style={styles.lensCore} />
          </Animated.View>
        </View>

        {/* 3 Status Indicator LEDs */}
        <View style={styles.ledContainer}>
          {/* Red LED (Power) */}
          <View style={[styles.led, styles.ledRed]}>
            <View style={styles.ledGlint} />
          </View>

          {/* Yellow LED (Processing/Scanning) */}
          <Animated.View
            style={[
              styles.led,
              styles.ledYellow,
              { opacity: isScanning ? yellowBlinkAnim : 0.8 },
            ]}>
            <View style={styles.ledGlint} />
          </Animated.View>

          {/* Green LED (Backend Online status) */}
          <View
            style={[
              styles.led,
              isOnline ? styles.ledGreen : styles.ledDim,
            ]}>
            <View style={styles.ledGlint} />
          </View>
        </View>

        {/* Right Action buttons: Connection Status & Settings */}
        <View style={styles.rightActionRow}>
          <View
            style={[
              styles.statusPill,
              isOnline ? styles.statusPillOnline : styles.statusPillOffline,
            ]}>
            <Text style={styles.statusPillText}>
              {isOnline ? 'ONLINE' : 'LOCALE'}
            </Text>
          </View>

          {batterySaver && (
            <View style={styles.batteryPill}>
              <Ionicons name="battery-half" size={14} color="#FFCB05" />
              <Text style={styles.batteryPillText}>ECO</Text>
            </View>
          )}

          {onSettingsPress && (
            <TouchableOpacity
              onPress={onSettingsPress}
              style={styles.settingsBtn}
              activeOpacity={0.7}>
              <Ionicons name="settings-sharp" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Decorative Pokédex Hinged Grooves */}
      <View style={styles.bevelBar}>
        <View style={styles.bevelSlit} />
        <View style={styles.bevelSlit} />
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.bevelSlit} />
        <View style={styles.bevelSlit} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: DexTheme.colors.pokedexRed,
    borderBottomWidth: 4,
    borderBottomColor: DexTheme.colors.pokedexRedDeep,
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lensBorder: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  lensInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DexTheme.colors.lensBlue,
    borderWidth: 2,
    borderColor: DexTheme.colors.lensBlueDeep,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lensCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0284C7',
  },
  lensReflection: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: 14,
    height: 9,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    transform: [{ rotate: '-35deg' }],
  },
  ledContainer: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 14,
    alignItems: 'center',
  },
  led: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    elevation: 3,
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
    backgroundColor: '#4B5563',
  },
  ledGlint: {
    position: 'absolute',
    top: 2,
    left: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  rightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
  },
  statusPillOffline: {
    backgroundColor: 'rgba(107, 114, 128, 0.25)',
    borderColor: '#9CA3AF',
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  batteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  batteryPillText: {
    color: '#FFCB05',
    fontSize: 10,
    fontWeight: '800',
  },
  settingsBtn: {
    backgroundColor: DexTheme.colors.pokedexRedDark,
    padding: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bevelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 12,
  },
  bevelSlit: {
    width: 24,
    height: 3,
    backgroundColor: DexTheme.colors.pokedexRedDeep,
    borderRadius: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

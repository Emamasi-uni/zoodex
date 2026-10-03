import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { DexEntry } from '../services/api';
import { DexTheme } from '../constants/dexTheme';
import { Ionicons } from '@expo/vector-icons';

interface UnlockModalProps {
  animal: DexEntry | null;
  onDismiss: () => void;
  onViewInDex?: (continent: string) => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({
  animal,
  onDismiss,
  onViewInDex,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animal) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.4);
      rotateAnim.setValue(0);
    }
  }, [animal]);

  if (!animal) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={!!animal} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.dialogCard,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          {/* Top Pokédex Banner */}
          <View style={styles.banner}>
            <Ionicons name="sparkles" size={18} color="#FFCB05" />
            <Text style={styles.bannerText}>NUOVA SPECIE SBLOCCATA!</Text>
            <Ionicons name="sparkles" size={18} color="#FFCB05" />
          </View>

          {/* Central Rotating Crest */}
          <View style={styles.badgeWrapper}>
            <Animated.View style={[styles.halo, { transform: [{ rotate: spin }] }]} />
            <View style={styles.iconCircle}>
              <Ionicons name="paw" size={44} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.dexNumber}>DEX #{animal.dex_number}</Text>
          <Text style={styles.animalName}>{animal.name}</Text>
          <Text style={styles.scientificName}>{animal.scientific_name}</Text>

          <View style={styles.continentPill}>
            <Ionicons name="earth" size={14} color="#00E5FF" />
            <Text style={styles.continentText}>CONTINENTE: {animal.continent_name}</Text>
          </View>

          <Text style={styles.description}>{animal.description}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {onViewInDex && (
              <TouchableOpacity
                style={styles.dexBtn}
                activeOpacity={0.8}
                onPress={() => {
                  onDismiss();
                  onViewInDex(animal.continent);
                }}>
                <Ionicons name="book" size={18} color="#FFFFFF" />
                <Text style={styles.btnText}>VEDI NEL DEX</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.continueBtn}
              activeOpacity={0.8}
              onPress={onDismiss}>
              <Text style={styles.continueBtnText}>CONTINUA SCANSIONE</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: DexTheme.colors.pokedexRed,
    alignItems: 'center',
    padding: 20,
    elevation: 20,
    shadowColor: '#DC0A2D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DexTheme.colors.pokedexRed,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  bannerText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  badgeWrapper: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  halo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    borderStyle: 'dashed',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: DexTheme.colors.pokemonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 6,
  },
  dexNumber: {
    color: '#00E5FF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 6,
  },
  animalName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    textAlign: 'center',
  },
  scientificName: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  continentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
  },
  continentText: {
    color: '#00E5FF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  description: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  buttonRow: {
    width: '100%',
    gap: 10,
  },
  dexBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DexTheme.colors.pokemonBlue,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  continueBtn: {
    backgroundColor: '#334155',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#E2E8F0',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

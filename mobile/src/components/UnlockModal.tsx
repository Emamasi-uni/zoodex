import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Image } from 'react-native';
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
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animal) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [animal]);

  if (!animal) return null;

  return (
    <Modal visible={!!animal} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.dialogCard,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}>
          {/* Header Banner */}
          <View style={styles.banner}>
            <View style={styles.statusIndicator} />
            <Text style={styles.bannerText}>SPECIE ACQUISITA NEL DATABASE</Text>
            <Text style={styles.bannerId}>#{animal.dex_number}</Text>
          </View>

          {/* Real Animal Photograph */}
          <View style={styles.imageContainer}>
            {animal.image_url ? (
              <Image
                source={{ uri: animal.image_url }}
                style={styles.animalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imageFallback}>
                <Ionicons name="scan-outline" size={48} color="#00E5FF" />
              </View>
            )}
            <View style={styles.imageOverlayGradient} />
            <View style={styles.rarityBadge}>
              <Text style={styles.rarityText}>{animal.rarity.toUpperCase()}</Text>
            </View>
          </View>

          {/* Classification Info */}
          <View style={styles.infoSection}>
            <Text style={styles.animalName}>{animal.name}</Text>
            <Text style={styles.scientificName}>{animal.scientific_name}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="globe-outline" size={12} color="#00E5FF" />
                <Text style={styles.metaText}>{animal.continent_name.toUpperCase()}</Text>
              </View>
              <View style={styles.metaChip}>
                <Ionicons name="layers-outline" size={12} color="#FBBF24" />
                <Text style={styles.metaText}>{animal.category.toUpperCase()}</Text>
              </View>
            </View>

            {/* Metrics */}
            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>ALTEZZA</Text>
                <Text style={styles.statVal}>{animal.height}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>PESO</Text>
                <Text style={styles.statVal}>{animal.weight}</Text>
              </View>
            </View>

            <Text style={styles.description} numberOfLines={3}>
              {animal.description}
            </Text>
          </View>

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
                <Ionicons name="book-outline" size={16} color="#FFFFFF" />
                <Text style={styles.btnText}>CONSULTA ARCHIVIO</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.continueBtn}
              activeOpacity={0.8}
              onPress={onDismiss}>
              <Text style={styles.continueBtnText}>RIPRENDI SCANSIONE</Text>
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
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  bannerText: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
    flex: 1,
    marginLeft: 8,
  },
  bannerId: {
    color: '#00E5FF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  imageContainer: {
    width: '100%',
    height: 190,
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  animalImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'transparent',
  },
  rarityBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  rarityText: {
    color: '#FBBF24',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoSection: {
    padding: 16,
  },
  animalName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scientificName: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  statVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  description: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  buttonRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  dexBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DexTheme.colors.pokemonBlue,
    paddingVertical: 11,
    borderRadius: 10,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  continueBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  continueBtnText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});

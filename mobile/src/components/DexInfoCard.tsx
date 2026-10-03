import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { DetectionItem } from '../services/api';
import { DexTheme } from '../constants/dexTheme';
import { Ionicons } from '@expo/vector-icons';

interface DexInfoCardProps {
  detection: DetectionItem;
  onClose: () => void;
  onOpenDex?: (continentId: string) => void;
}

export const DexInfoCard: React.FC<DexInfoCardProps> = ({
  detection,
  onClose,
  onOpenDex,
}) => {
  const dex = detection.dex_entry;
  const isAnimal = detection.is_animal;

  return (
    <View style={styles.cardWrapper}>
      {/* Pokédex Screen Metallic Bezel */}
      <View style={styles.bezelFrame}>
        {/* Top Screen Status Bar */}
        <View style={styles.screenHeader}>
          <View style={styles.dexNoBadge}>
            <Text style={styles.dexNoText}>DEX #{dex.dex_number}</Text>
          </View>
          <View style={styles.continentTag}>
            <Ionicons name="earth" size={12} color="#38BDF8" />
            <Text style={styles.continentText}>{dex.continent_name.toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* LCD Green/Dark Display Content */}
        <View style={styles.lcdScreen}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.animalName}>{dex.name}</Text>
              <Text style={styles.scientificName}>{dex.scientific_name}</Text>
            </View>
            <View style={[styles.rarityBadge, { borderColor: dex.badge_color || '#3B82F6' }]}>
              <Text style={[styles.rarityText, { color: dex.badge_color || '#3B82F6' }]}>
                {dex.rarity}
              </Text>
            </View>
          </View>

          {/* Stat Meters: Altezza, Peso, Confidenza */}
          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ALTEZZA</Text>
              <Text style={styles.statValue}>{dex.height}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>PESO</Text>
              <Text style={styles.statValue}>{dex.weight}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ACCURATEZZA</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {Math.round(detection.confidence * 100)}%
              </Text>
            </View>
          </View>

          {/* Pokédex Lore / Description */}
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{dex.description}</Text>
          </View>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            {isAnimal && onOpenDex && (
              <TouchableOpacity
                style={styles.dexActionBtn}
                onPress={() => onOpenDex(dex.continent)}
                activeOpacity={0.8}>
                <Ionicons name="book" size={16} color="#FFFFFF" />
                <Text style={styles.dexActionBtnText}>VEDI NEL CATALOGO</Text>
              </TouchableOpacity>
            )}

            <View style={styles.statusIndicator}>
              <View style={styles.pulsingGreenDot} />
              <Text style={styles.statusText}>
                {isAnimal ? 'SPECIE REGISTRATA' : 'OGGETTO ANALIZZATO'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bezelFrame: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dexNoBadge: {
    backgroundColor: DexTheme.colors.pokedexRed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dexNoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  continentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  continentText: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  lcdScreen: {
    padding: 14,
    backgroundColor: '#0F172A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  animalName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scientificName: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  rarityBadge: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statGrid: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '900',
  },
  descriptionBox: {
    backgroundColor: 'rgba(6, 78, 59, 0.35)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    padding: 10,
    borderRadius: 6,
    marginVertical: 8,
  },
  descriptionText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dexActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DexTheme.colors.pokemonBlue,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dexActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});

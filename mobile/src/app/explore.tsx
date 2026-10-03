import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { DexTheme } from '../constants/dexTheme';
import { DexHeader } from '../components/DexHeader';
import { ZoodexApi, AnimalItem, ContinentItem } from '../services/api';
import { useDexStore } from '../store/dexStore';

export default function ExploreScreen() {
  const router = useRouter();
  const { selectedContinent, setSelectedContinent } = useDexStore();

  const [continents, setContinents] = useState<ContinentItem[]>([]);
  const [animals, setAnimals] = useState<AnimalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalItem | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedContinent]);

  const loadData = async () => {
    setLoading(true);
    try {
      const contData = await ZoodexApi.getContinents();
      setContinents(contData);

      const animData = await ZoodexApi.getAnimals(
        selectedContinent === 'all' ? undefined : selectedContinent
      );
      setAnimals(animData);
    } catch (e) {
      console.warn('Errore caricamento catalogo:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnimals = animals.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.scientific_name.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.dex_number.includes(q)
    );
  });

  const unlockedCount = animals.filter((a) => a.is_unlocked).length;
  const totalCount = animals.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <DexHeader title="ZOODEX · ARCHIVIO" />

      <View style={styles.container}>
        {/* Continent Filter Selector Carousel */}
        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.continentChip,
                selectedContinent === 'all' && styles.continentChipActive,
              ]}
              onPress={() => setSelectedContinent('all')}>
              <Ionicons
                name="globe-outline"
                size={14}
                color={selectedContinent === 'all' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.continentChipText,
                  selectedContinent === 'all' && styles.continentChipTextActive,
                ]}>
                TUTTI
              </Text>
            </TouchableOpacity>

            {continents.map((c) => {
              const isActive = selectedContinent === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.continentChip,
                    isActive && styles.continentChipActive,
                    { borderColor: c.color },
                  ]}
                  onPress={() => setSelectedContinent(c.id)}>
                  <Text
                    style={[
                      styles.continentChipText,
                      isActive && styles.continentChipTextActive,
                    ]}>
                    {c.name.toUpperCase()} ({c.discovered_animals}/{c.total_animals})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Pokédex Progress Banner */}
        <View style={styles.progressBezel}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>PROGRESSO CATALOGO</Text>
            <Text style={styles.progressValue}>
              {unlockedCount} / {totalCount} SCOPERTI ({progressPercent}%)
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(5, progressPercent)}%` },
              ]}
            />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca specie, numero o categoria..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Animals Grid View */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#00E5FF" />
            <Text style={styles.loadingText}>ACCESSO AL DATABASE ZOODEX...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}>
            {filteredAnimals.map((animal) => {
              const isUnlocked = animal.is_unlocked;

              return (
                <TouchableOpacity
                  key={animal.dex_number}
                  style={[
                    styles.animalCard,
                    isUnlocked ? styles.cardUnlocked : styles.cardLocked,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedAnimal(animal)}>
                  {/* Card Header: Dex # and Continent */}
                  <View style={styles.cardHeader}>
                    <Text
                      style={[
                        styles.dexNumberText,
                        isUnlocked ? styles.dexNumUnlocked : styles.dexNumLocked,
                      ]}>
                      #{animal.dex_number}
                    </Text>
                    {isUnlocked && (
                      <View style={styles.unlockedIconBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      </View>
                    )}
                  </View>

                  {/* Animal Sprite / Silhouette Box */}
                  <View
                    style={[
                      styles.spriteBox,
                      isUnlocked ? styles.spriteBoxUnlocked : styles.spriteBoxLocked,
                    ]}>
                    {isUnlocked ? (
                      <View style={styles.spriteContent}>
                        <Ionicons name="paw" size={38} color="#00E5FF" />
                        <View style={styles.silhouetteGlow} />
                      </View>
                    ) : (
                      <View style={styles.lockedSilhouetteBox}>
                        <Ionicons name="help" size={42} color="#475569" />
                      </View>
                    )}
                  </View>

                  {/* Animal Info */}
                  <View style={styles.cardBody}>
                    <Text
                      style={[
                        styles.cardName,
                        !isUnlocked && styles.cardNameLocked,
                      ]}
                      numberOfLines={1}>
                      {isUnlocked ? animal.name : '???'}
                    </Text>

                    <Text style={styles.cardCategory} numberOfLines={1}>
                      {animal.category}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.continentLabel}>
                        {animal.continent_name}
                      </Text>
                      {isUnlocked && (
                        <Text style={styles.rarityLabel}>{animal.rarity}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Animal Biometric Dossier Modal */}
      <Modal visible={!!selectedAnimal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.dossierCard}>
            {selectedAnimal && (
              <>
                {/* Dossier Top Banner */}
                <View style={styles.dossierHeader}>
                  <View style={styles.dossierDexBadge}>
                    <Text style={styles.dossierDexText}>
                      DEX #{selectedAnimal.dex_number}
                    </Text>
                  </View>
                  <Text style={styles.dossierStatus}>
                    {selectedAnimal.is_unlocked
                      ? 'ESEMPLARE ACQUISITO'
                      : 'ESEMPLARE NON ACQUISITO'}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedAnimal(null)}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Main LCD Screen */}
                <View style={styles.dossierScreen}>
                  <View style={styles.dossierSpriteArea}>
                    <Ionicons
                      name="paw"
                      size={60}
                      color={selectedAnimal.is_unlocked ? '#00E5FF' : '#475569'}
                    />
                  </View>

                  <Text style={styles.dossierTitle}>
                    {selectedAnimal.is_unlocked ? selectedAnimal.name : 'SPECIE SCONOSCIUTA'}
                  </Text>
                  <Text style={styles.dossierScientific}>
                    {selectedAnimal.is_unlocked
                      ? selectedAnimal.scientific_name
                      : 'Inquadra questo animale con la fotocamera per sbloccarlo.'}
                  </Text>

                  {selectedAnimal.is_unlocked && (
                    <>
                      <View style={styles.statGrid}>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>ALTEZZA</Text>
                          <Text style={styles.statVal}>{selectedAnimal.height}</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>PESO</Text>
                          <Text style={styles.statVal}>{selectedAnimal.weight}</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>RARITÀ</Text>
                          <Text style={[styles.statVal, { color: '#FBBF24' }]}>
                            {selectedAnimal.rarity}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dossierLore}>
                        <Text style={styles.loreText}>{selectedAnimal.description}</Text>
                      </View>
                    </>
                  )}

                  {!selectedAnimal.is_unlocked && (
                    <TouchableOpacity
                      style={styles.scanTargetBtn}
                      onPress={() => {
                        setSelectedAnimal(null);
                        router.push('/');
                      }}>
                      <Ionicons name="scan" size={18} color="#FFFFFF" />
                      <Text style={styles.scanTargetBtnText}>APRI SCANNER PER TROVARLO</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: DexTheme.colors.pokedexRed,
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  filterBar: {
    backgroundColor: DexTheme.colors.pokedexRed,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: DexTheme.colors.pokedexRedDeep,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  continentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  continentChipActive: {
    backgroundColor: DexTheme.colors.pokemonBlue,
    borderColor: '#FFFFFF',
  },
  continentChipText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 11,
  },
  continentChipTextActive: {
    color: '#FFFFFF',
  },
  progressBezel: {
    backgroundColor: '#1E293B',
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressValue: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingBottom: 24,
    gap: 10,
  },
  animalCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    elevation: 4,
  },
  cardUnlocked: {
    borderColor: '#334155',
  },
  cardLocked: {
    borderColor: '#1E293B',
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  dexNumberText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dexNumUnlocked: {
    color: '#00E5FF',
  },
  dexNumLocked: {
    color: '#64748B',
  },
  unlockedIconBadge: {},
  spriteBox: {
    height: 90,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spriteBoxUnlocked: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  spriteBoxLocked: {
    backgroundColor: '#0B0F19',
  },
  spriteContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  silhouetteGlow: {},
  lockedSilhouetteBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: 8,
    backgroundColor: '#1E293B',
  },
  cardName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  cardNameLocked: {
    color: '#64748B',
  },
  cardCategory: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 4,
  },
  continentLabel: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  rarityLabel: {
    color: '#FBBF24',
    fontSize: 9,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dossierCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: DexTheme.colors.pokedexRed,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: DexTheme.colors.pokedexRedDeep,
    overflow: 'hidden',
  },
  dossierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dossierDexBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dossierDexText: {
    color: DexTheme.colors.pokedexRed,
    fontWeight: '900',
    fontSize: 11,
  },
  dossierStatus: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dossierScreen: {
    backgroundColor: '#0F172A',
    margin: 8,
    borderRadius: 14,
    padding: 16,
    borderWidth: 3,
    borderColor: '#334155',
  },
  dossierSpriteArea: {
    height: 110,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  dossierTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  dossierScientific: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  statVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dossierLore: {
    backgroundColor: 'rgba(6, 78, 59, 0.35)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  loreText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },
  scanTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DexTheme.colors.pokemonBlue,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  scanTargetBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
});

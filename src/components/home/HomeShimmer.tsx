import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useAppTheme } from '../../contexts/themeContext';
import { getShadow, spacing, borderRadius } from '../../theme';

// Shimmer animado
function ShimmerBlock({ 
  width, 
  height, 
  borderRadiusValue = borderRadius.md,
  style,
}: { 
  width: number | string; 
  height: number; 
  borderRadiusValue?: number;
  style?: any;
}) {
  const { colors } = useAppTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadiusValue,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Card shimmer genérico
function ShimmerCard({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors), style]}>
      {children}
    </View>
  );
}

// Shimmer do UpcomingFlowsCard
export function UpcomingFlowsCardShimmer() {
  return (
    <ShimmerCard>
      <View style={styles.listItem}>
        <ShimmerBlock width={280} height={16} />
        <ShimmerBlock width={24} height={24} borderRadiusValue={12} />
      </View>
    </ShimmerCard>
  );
}

// Shimmer do AccountsCard
export function AccountsCardShimmer() {
  return (
    <ShimmerCard>
      {/* Header */}
      <View style={styles.header}>
        <ShimmerBlock width={140} height={20} />
        <ShimmerBlock width={100} height={28} />
      </View>
      {/* Subtitle */}
      <View style={{ marginTop: 8 }}>
        <ShimmerBlock width={180} height={14} />
      </View>
      {/* Account items */}
      <View style={styles.listContainer}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <ShimmerBlock width={40} height={40} borderRadiusValue={20} />
              <View style={{ marginLeft: 12, gap: 6 }}>
                <ShimmerBlock width={100} height={16} />
                <ShimmerBlock width={60} height={12} />
              </View>
            </View>
            <ShimmerBlock width={80} height={18} />
          </View>
        ))}
      </View>
    </ShimmerCard>
  );
}

// Shimmer do CreditCardsCard
export function CreditCardsCardShimmer() {
  return (
    <ShimmerCard>
      {/* Header */}
      <View style={styles.header}>
        <ShimmerBlock width={140} height={14} />
      </View>
      <View style={{ marginTop: 10 }}>
        <ShimmerBlock width={120} height={28} />
      </View>
      <View style={{ marginTop: 6 }}>
        <ShimmerBlock width={120} height={12} />
      </View>
      {/* Card item */}
      <View style={[styles.cardItem, { marginTop: 16 }]}>
        <View style={styles.listItemLeft}>
          <ShimmerBlock width={48} height={48} borderRadiusValue={12} />
          <View style={{ marginLeft: 12, gap: 6 }}>
            <ShimmerBlock width={120} height={16} />
            <ShimmerBlock width={80} height={12} />
          </View>
        </View>
        <ShimmerBlock width={90} height={18} />
      </View>
    </ShimmerCard>
  );
}

// Shimmer do GoalCard
export function GoalCardShimmer() {
  return (
    <ShimmerCard>
      {/* Header */}
      <View style={styles.header}>
        <ShimmerBlock width={140} height={20} />
      </View>
      {/* Goal content */}
      <View style={{ marginTop: 16, alignItems: 'center', gap: 12 }}>
        <ShimmerBlock width={64} height={64} borderRadiusValue={32} />
        <ShimmerBlock width={160} height={18} />
        <ShimmerBlock width={200} height={14} />
        {/* Progress bar */}
        <View style={{ width: '100%', marginTop: 8 }}>
          <ShimmerBlock width="100%" height={8} borderRadiusValue={4} />
        </View>
        <View style={styles.progressLabels}>
          <ShimmerBlock width={80} height={14} />
          <ShimmerBlock width={80} height={14} />
        </View>
      </View>
    </ShimmerCard>
  );
}

// Shimmer do TransactionsByCategoryCard
export function CategoryCardShimmer() {
  return (
    <ShimmerCard>
      {/* Header */}
      <View style={styles.header}>
        <ShimmerBlock width={180} height={20} />
      </View>
      {/* Filter tabs */}
      <View style={[styles.filterRow, { marginTop: 12 }]}>
        <ShimmerBlock width={80} height={32} borderRadiusValue={16} />
        <ShimmerBlock width={80} height={32} borderRadiusValue={16} />
      </View>
      {/* Category items */}
      <View style={[styles.listContainer, { marginTop: 16 }]}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <ShimmerBlock width={36} height={36} borderRadiusValue={18} />
              <View style={{ marginLeft: 12, gap: 4 }}>
                <ShimmerBlock width={100} height={14} />
                <ShimmerBlock width={60} height={12} />
              </View>
            </View>
            <ShimmerBlock width={70} height={16} />
          </View>
        ))}
      </View>
    </ShimmerCard>
  );
}

// Componente principal de shimmer da Home
export default memo(function HomeShimmer() {
  return (
    <View style={styles.container}>
      <AccountsCardShimmer />
      <View style={{ height: 24 }} />
      <CreditCardsCardShimmer />
      <View style={{ height: 24 }} />
      <GoalCardShimmer />
      <View style={{ height: 24 }} />
      <CategoryCardShimmer />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listContainer: {
    marginTop: 16,
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
});

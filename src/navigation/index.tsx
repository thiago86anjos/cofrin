import React, { lazy, Suspense } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";

// Telas críticas - carregadas imediatamente
import Login from "../screens/Login";
import Register from "../screens/Register";
import Home from "../screens/Home";

// Telas secundárias - lazy loaded para reduzir bundle inicial
const Terms = lazy(() => import("../screens/Terms"));
const Settings = lazy(() => import("../screens/Settings"));
const EditProfile = lazy(() => import("../screens/EditProfile"));
const ConfigureAccounts = lazy(() => import("../screens/ConfigureAccounts"));
const CreditCards = lazy(() => import("../screens/CreditCards"));
const CreditCardBillDetails = lazy(() => import("../screens/CreditCardBillDetails"));
const Categories = lazy(() => import("../screens/Categories"));
const CategoryDetails = lazy(() => import("../screens/CategoryDetails"));
const About = lazy(() => import("../screens/About"));
const Education = lazy(() => import("../screens/Education"));
const Launches = lazy(() => import("../screens/Launches"));
const Reports = lazy(() => import("../screens/Reports"));
const Goals = lazy(() => import("../screens/Goals"));
const MyGoals = lazy(() => import("../screens/MyGoals"));
const ManageGoals = lazy(() => import("../screens/ManageGoals"));

import { useAuth } from "../contexts/authContext";

const Stack = createNativeStackNavigator();

// Fallback de loading para telas lazy
const LazyFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
    <ActivityIndicator size="large" color="#5B3CC4" />
  </View>
);

// HOC para envolver componentes lazy com Suspense
const withSuspense = (LazyComponent: React.LazyExoticComponent<React.ComponentType<any>>) => {
  return (props: any) => (
    <Suspense fallback={<LazyFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Wrappers com Suspense para cada tela lazy
const TermsScreen = withSuspense(Terms);
const SettingsScreen = withSuspense(Settings);
const EditProfileScreen = withSuspense(EditProfile);
const ConfigureAccountsScreen = withSuspense(ConfigureAccounts);
const CreditCardsScreen = withSuspense(CreditCards);
const CreditCardBillDetailsScreen = withSuspense(CreditCardBillDetails);
const CategoriesScreen = withSuspense(Categories);
const CategoryDetailsScreen = withSuspense(CategoryDetails);
const AboutScreen = withSuspense(About);
const EducationScreen = withSuspense(Education);
const LaunchesScreen = withSuspense(Launches);
const ReportsScreen = withSuspense(Reports);
const GoalsScreen = withSuspense(Goals);
const MyGoalsScreen = withSuspense(MyGoals);
const ManageGoalsScreen = withSuspense(ManageGoals);

// Configuração de Deep Linking
const linking = {
  prefixes: ['cofrin://', 'https://cofrin.app', 'https://www.cofrin.app'],
  config: {
    screens: {
      'Termos de Uso': 'termos',
      'Faça login': 'login',
      'Crie uma conta': 'registro',
    },
  },
};

export default function RootNavigation() {
  const { user, loading } = useAuth();

  if (loading) {
    // Tela de loading durante verificação
    return null;
  }

  return (
    <NavigationContainer linking={linking}>
      {user ? (
        // ROTAS DO USUÁRIO LOGADO
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Bem-vindo" component={Home} />
          <Stack.Screen name="Lançamentos" component={LaunchesScreen} />
          <Stack.Screen name="Relatórios" component={ReportsScreen} />
          <Stack.Screen name="Metas do ano" component={GoalsScreen} />
          <Stack.Screen name="Meus Objetivos" component={MyGoalsScreen} />
          <Stack.Screen name="ManageGoals" component={ManageGoalsScreen} />
          <Stack.Screen name="Configurações" component={SettingsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ConfigureAccounts" component={ConfigureAccountsScreen} />
          <Stack.Screen name="CreditCards" component={CreditCardsScreen} />
          <Stack.Screen name="CreditCardBillDetails" component={CreditCardBillDetailsScreen} />
          <Stack.Screen name="Categories" component={CategoriesScreen} />
          <Stack.Screen name="CategoryDetails" component={CategoryDetailsScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="Education" component={EducationScreen} />
        </Stack.Navigator>
      ) : (
        // ROTAS PÚBLICAS
        <Stack.Navigator>
          <Stack.Screen name="Faça login" component={Login} options={{ headerShown: false }} />
          <Stack.Screen name="Crie uma conta" component={Register} options={{ headerShown: false }} />
          <Stack.Screen name="Termos de Uso" component={TermsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

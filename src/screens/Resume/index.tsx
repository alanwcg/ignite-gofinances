import React, { useState, useCallback } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VictoryPie } from 'victory-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useTheme } from 'styled-components';
import { useFocusEffect } from '@react-navigation/native';
import { addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { categories } from '../../utils/categories';
import { useAuth } from '../../hooks/auth';

import { HistoryCard } from '../../components/HistoryCard';

import {
  Container,
  Header,
  LoadContainer,
  Title,
  Content,
  ChartContainer,
  MonthSelect,
  MonthSelectButton,
  MonthSelectIcon,
  Month,
} from './styles';

interface TransactionData {
  type: 'positive' | 'negative';
  name: string;
  amount: string;
  category: string;
  date: string;
}

interface CategoryData {
  key: string;
  name: string;
  total: number;
  totalFormatted: string;
  color: string;
  percent: string;
}

export function Resume() {
  const theme = useTheme();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [totalByCategories, setTotalByCategories] = useState<CategoryData[]>([]);

  function handleDateChange(action: 'next' | 'prev') {
    if (action === 'next') {
      setSelectedDate(addMonths(selectedDate, 1));
    } else {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  }

  async function loadData() {
    try {
      setIsLoading(true);

      const dataKey = `@gofinances:transactions_user:${user.id}`;
      const response = await AsyncStorage.getItem(dataKey);
      const responseFormatted: TransactionData[] = response
        ? JSON.parse(response)
        : [];

      const expenses = responseFormatted
        .filter(expense =>
          expense.type === 'negative' &&
          new Date(expense.date).getMonth() === selectedDate.getMonth() &&
          new Date(expense.date).getFullYear() === selectedDate.getFullYear()
        );

      const expensesTotal = expenses
        .reduce((sum, expense) => sum + Number(expense.amount), 0);

      const totalByCategory: CategoryData[] = [];

      categories.forEach(category => {
        const categorySum = expenses
          .filter(expense => expense.category === category.key)
          .reduce((sum, expense) => sum + Number(expense.amount), 0);

        if (categorySum > 0) {
          const totalFormatted = categorySum.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          });

          const percent = `${(categorySum / expensesTotal * 100).toFixed(0)}%`;

          totalByCategory.push({
            key: category.key,
            name: category.name,
            total: categorySum,
            totalFormatted,
            color: category.color,
            percent,
          });
        }
      });

      setTotalByCategories(totalByCategory);
      setIsLoading(false);
    } catch (error) {
      console.log(error);
      setIsLoading(false);
      Alert.alert('Não foi possível salvar');
    }
  }

  useFocusEffect(useCallback(() => {
    loadData();
  }, [selectedDate]));

  return (
    <Container>
      <Header>
        <Title>Resumo por categoria</Title>
      </Header>

      <MonthSelect>
        <MonthSelectButton onPress={() => handleDateChange('prev')}>
          <MonthSelectIcon name="chevron-left" />
        </MonthSelectButton>

        <Month>{format(selectedDate, 'MMMM, yyyy', { locale: ptBR })}</Month>

        <MonthSelectButton onPress={() => handleDateChange('next')}>
          <MonthSelectIcon name="chevron-right" />
        </MonthSelectButton>
      </MonthSelect>

      {isLoading ? (
        <LoadContainer>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </LoadContainer>
      ) : (
        <>
          <ChartContainer>
            <VictoryPie
              data={totalByCategories}
              colorScale={totalByCategories.map(category => category.color)}
              style={{
                labels: {
                  fontSize: RFValue(18),
                  fontWeight: 'bold',
                  fill: theme.colors.shape,
                }
              }}
              labelRadius={70}
              x="percent"
              y="total"
            />
          </ChartContainer>

          <Content
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 24,
              paddingBottom: 24,
              // paddingBottom: useBottomTabBarHeight(),
            }}
          >
            {totalByCategories.map(item => (
              <HistoryCard
                key={item.key}
                title={item.name}
                amount={item.totalFormatted}
                color={item.color}
              />
            ))}
          </Content>
        </>
      )}   
    </Container>
  );
}

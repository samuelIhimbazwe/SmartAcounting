import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import {
  copilotService,
  CopilotMessage,
} from '../../services/copilot/MobileCopilotService';
import {streamCopilotAgent} from '../../services/copilot/streamCopilotAgent';
import {approveCopilotAction, rejectCopilotAction} from '../../api/copilot';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {fetchExpiringItems} from '../../inventory/inventorySync';
import {refreshReorderAlerts} from '../../inventory/reorderCheck';

const SUGGESTIONS: Record<string, string[]> = {
  CEO: [
    'What is our revenue today?',
    'How is cash runway looking?',
    'Any critical alerts I should know about?',
    'What are our top selling products this week?',
  ],
  CFO: [
    'What invoices are overdue?',
    'How is our DSO tracking?',
    'Any unmatched reconciliation items?',
    'What is our cash position?',
  ],
  SALES_MANAGER: [
    'Which customers owe us the most?',
    'How are we tracking vs target?',
    'Which products have the best margin?',
    'Who are our top customers this month?',
  ],
  OPS_MANAGER: [
    'What is low on stock?',
    'Show expiring stock',
    'Which supplier costs have increased?',
    'What needs reordering?',
  ],
  ACCOUNTING_CONTROLLER: [
    'Any till variances today?',
    'How many unmatched MoMo payments?',
    'What month-end tasks are still open?',
    'Any unusual journal entries?',
  ],
  HR_MANAGER: [
    'Who is absent today?',
    'Any leave requests pending approval?',
    'When is payroll due?',
    'What is our headcount this month?',
  ],
};

type PendingApproval = {
  approvalId: string;
  description: string;
};

export default function CopilotScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [streamFallback, setStreamFallback] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(
    null,
  );
  const [approvalBusy, setApprovalBusy] = useState(false);
  const listRef = useRef<FlatList>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopStreamRef.current?.(), []);

  const {role, userName, accessToken, tenantId, userId} = useSelector(
    (s: RootState) => s.auth,
  );

  const suggestions = SUGGESTIONS[role || 'CEO'] ?? SUGGESTIONS.CEO;

  const handleInventoryShortcut = useCallback(
    async (text: string): Promise<boolean> => {
      const q = text.toLowerCase();
      if (q.includes('expiring')) {
        const rows = await fetchExpiringItems(30);
        const summary = rows
          .slice(0, 10)
          .map(r => {
            const row = r as Record<string, unknown>;
            return `${String(row.productName ?? row.pname ?? 'Item')} · ${String(row.expiryDate ?? '')}`;
          })
          .join('\n');
        setMessages(prev => [
          ...prev,
          {id: String(Date.now()), role: 'user', content: text, timestamp: new Date()},
          {
            id: String(Date.now() + 1),
            role: 'assistant',
            content: summary || t('inventory.noExpiring'),
            timestamp: new Date(),
          },
        ]);
        navigation.navigate('Stock' as never, {screen: 'Expiring'} as never);
        return true;
      }
      if (q.includes('reorder')) {
        const alerts = await refreshReorderAlerts();
        const summary = alerts
          .map(a => `${a.productName}: ${a.stockQty} ≤ ${a.reorderPoint}`)
          .join('\n');
        setMessages(prev => [
          ...prev,
          {id: String(Date.now()), role: 'user', content: text, timestamp: new Date()},
          {
            id: String(Date.now() + 1),
            role: 'assistant',
            content: summary || t('inventory.noReorder'),
            timestamp: new Date(),
          },
        ]);
        navigation.navigate('Stock' as never, {screen: 'Reorder'} as never);
        return true;
      }
      return false;
    },
    [navigation, t],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) {
        return;
      }

      if (await handleInventoryShortcut(text.trim())) {
        return;
      }

      const userMessage: CopilotMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      const assistantId = (Date.now() + 1).toString();
      const assistantMessage: CopilotMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setInput('');
      setLoading(true);
      setStreamFallback(false);
      setTimeout(() => listRef.current?.scrollToEnd({animated: false}), 100);

      try {
        if (agentMode && accessToken) {
          stopStreamRef.current = streamCopilotAgent(
            text.trim(),
            role || 'CEO',
            accessToken,
            tenantId,
            userId,
            evt => {
              if (evt.event === 'step') {
                const payload = evt.data;
                const status = String(payload.status ?? '');
                if (status === 'PENDING_APPROVAL' || payload.approvalRequired) {
                  setPendingApproval({
                    approvalId: String(
                      payload.approvalId ?? payload.approval_id ?? '',
                    ),
                    description: String(
                      payload.actionDescription ??
                        payload.description ??
                        'Action requires approval',
                    ),
                  });
                }
                const stepText = String(payload.message ?? payload.summary ?? '');
                if (stepText) {
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId
                        ? {...m, content: `${m.content}\n${stepText}`.trim()}
                        : m,
                    ),
                  );
                }
              }
              if (evt.event === 'token' || evt.event === 'message') {
                const chunk = String(evt.data.token ?? evt.data.text ?? '');
                if (chunk) {
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId
                        ? {...m, content: m.content + chunk}
                        : m,
                    ),
                  );
                }
              }
            },
            () => {
              stopStreamRef.current = null;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? {...m, isStreaming: false} : m,
                ),
              );
              setLoading(false);
            },
            () => {
              stopStreamRef.current = null;
              setLoading(false);
            },
          );
          return;
        }

        await copilotService.startRun(text.trim(), role || 'CEO', update => {
          if (update.streamFallback) {
            setStreamFallback(true);
          }
          const streaming = update.status === 'running';
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? {
                    ...m,
                    content: update.content,
                    isStreaming: streaming,
                    runId: update.runId,
                    streamFallback: update.streamFallback,
                  }
                : m,
            ),
          );
          setTimeout(() => listRef.current?.scrollToEnd({animated: false}), 50);
        });
      } catch {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content: t('copilot.errorRetry'),
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, role, agentMode, accessToken, tenantId, userId, t, handleInventoryShortcut],
  );

  const resolveApproval = async (approved: boolean) => {
    if (!pendingApproval?.approvalId) {
      return;
    }
    setApprovalBusy(true);
    try {
      if (approved) {
        await approveCopilotAction(pendingApproval.approvalId);
      } else {
        await rejectCopilotAction(pendingApproval.approvalId);
      }
      setPendingApproval(null);
    } finally {
      setApprovalBusy(false);
    }
  };

  const renderMessage = ({item}: {item: CopilotMessage}) => (
    <View
      style={[
        styles.messageBubble,
        item.role === 'user' ? styles.userBubble : styles.assistantBubble,
      ]}>
      <Text
        style={[
          styles.messageText,
          item.role === 'user' ? styles.userText : styles.assistantText,
        ]}>
        {item.content}
        {item.isStreaming ? (
          <Text style={styles.cursor}>|</Text>
        ) : null}
      </Text>
      {item.streamFallback && !item.isStreaming ? (
        <Text style={styles.fallbackNote}>{t('copilot.streamFallback')}</Text>
      ) : null}
      {item.isStreaming && !item.content ? (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#1B6FDB" />
          <Text style={styles.typingText}>{t('copilot.thinking')}</Text>
        </View>
      ) : null}
      <Text style={styles.messageTime}>
        {item.timestamp.toLocaleTimeString('en-RW', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('copilot.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('copilot.subtitle')}</Text>
        {streamFallback ? (
          <Text style={styles.headerFallback}>{t('copilot.streamFallback')}</Text>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Hello, {userName?.split(' ')[0] || 'there'} 👋
            </Text>
            <Text style={styles.emptySubtitle}>
              I have access to your sales, inventory, and financial data. What
              would you like to know?
            </Text>
            <Text style={styles.suggestionsTitle}>Try asking:</Text>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionChip}
                onPress={() => void sendMessage(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
      />

      {pendingApproval ? (
        <View style={styles.approvalCard}>
          <Text style={styles.approvalTitle}>{t('copilot.approvalWaiting')}</Text>
          <Text style={styles.approvalBody}>{pendingApproval.description}</Text>
          <View style={styles.approvalActions}>
            <TouchableOpacity
              style={[styles.approvalBtn, styles.approveBtn]}
              disabled={approvalBusy}
              onPress={() => void resolveApproval(true)}>
              <Text style={styles.approvalBtnText}>{t('copilot.approve')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.approvalBtn, styles.rejectBtn]}
              disabled={approvalBusy}
              onPress={() => void resolveApproval(false)}>
              <Text style={styles.approvalBtnText}>{t('copilot.reject')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeChip, !agentMode && styles.modeChipActive]}
          onPress={() => setAgentMode(false)}>
          <Text style={styles.modeChipText}>{t('copilot.queryMode')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeChip, agentMode && styles.modeChipActive]}
          onPress={() => setAgentMode(true)}>
          <Text style={styles.modeChipText}>{t('copilot.agentMode')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('copilot.placeholder')}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => void sendMessage(input)}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim() || loading) && styles.sendButtonDisabled,
          ]}
          onPress={() => void sendMessage(input)}
          disabled={!input.trim() || loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>
              {agentMode ? t('copilot.runAgent') : t('copilot.send')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F8FAFC'},
  header: {backgroundColor: '#1B6FDB', padding: 16, paddingTop: 20},
  headerTitle: {fontSize: 20, fontWeight: '700', color: '#FFFFFF'},
  headerSubtitle: {fontSize: 13, color: '#BFDBFE', marginTop: 2},
  messageList: {flex: 1},
  messageListContent: {padding: 16, paddingBottom: 8},
  messageBubble: {maxWidth: '85%', borderRadius: 12, padding: 12, marginBottom: 12},
  userBubble: {alignSelf: 'flex-end', backgroundColor: '#1B6FDB'},
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  messageText: {fontSize: 15, lineHeight: 22},
  userText: {color: '#FFFFFF'},
  assistantText: {color: '#0F172A'},
  messageTime: {fontSize: 11, marginTop: 4, color: '#94A3B8', alignSelf: 'flex-end'},
  cursor: {color: '#1B6FDB', fontWeight: '700'},
  fallbackNote: {fontSize: 11, color: '#94A3B8', marginTop: 6, fontStyle: 'italic'},
  headerFallback: {fontSize: 11, color: '#FDE68A', marginTop: 6},
  typingRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4},
  typingText: {fontSize: 14, color: '#64748B', fontStyle: 'italic'},
  emptyState: {padding: 24, alignItems: 'center'},
  emptyTitle: {fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 8},
  emptySubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  suggestionText: {fontSize: 14, color: '#1B6FDB', fontWeight: '500'},
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#0F172A',
  },
  sendButton: {
    backgroundColor: '#1B6FDB',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    minWidth: 64,
  },
  sendButtonDisabled: {backgroundColor: '#93C5FD'},
  sendButtonText: {color: '#FFFFFF', fontWeight: '600', fontSize: 15},
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
  },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  modeChipActive: {backgroundColor: '#DBEAFE', borderColor: '#1B6FDB'},
  modeChipText: {fontSize: 13, fontWeight: '600', color: '#1E40AF'},
  approvalCard: {
    margin: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  approvalTitle: {fontWeight: '700', marginBottom: 6, color: '#92400E'},
  approvalBody: {color: '#78350F', marginBottom: 10},
  approvalActions: {flexDirection: 'row', gap: 8},
  approvalBtn: {flex: 1, padding: 10, borderRadius: 8, alignItems: 'center'},
  approveBtn: {backgroundColor: '#16A34A'},
  rejectBtn: {backgroundColor: '#DC2626'},
  approvalBtnText: {color: '#FFFFFF', fontWeight: '600'},
});

import React, {useState, useRef, useCallback} from 'react';
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
    'Any items expiring this week?',
    'Which supplier costs have increased?',
    'What needs to be reordered today?',
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

export default function CopilotScreen() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const {role, userName} = useSelector((s: RootState) => s.auth);

  const suggestions = SUGGESTIONS[role || 'CEO'] ?? SUGGESTIONS.CEO;

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) {
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
      setTimeout(() => listRef.current?.scrollToEnd(), 100);

      try {
        await copilotService.startRun(text.trim(), role || 'CEO', update => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? {
                    ...m,
                    content: update.content,
                    isStreaming: false,
                    runId: update.runId,
                  }
                : m,
            ),
          );
          setTimeout(() => listRef.current?.scrollToEnd(), 100);
        });
      } catch {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    'Sorry, I could not process that. Please try again.',
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, role],
  );

  const renderMessage = ({item}: {item: CopilotMessage}) => (
    <View
      style={[
        styles.messageBubble,
        item.role === 'user' ? styles.userBubble : styles.assistantBubble,
      ]}>
      {item.isStreaming ? (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#1B6FDB" />
          <Text style={styles.typingText}>Thinking...</Text>
        </View>
      ) : (
        <Text
          style={[
            styles.messageText,
            item.role === 'user' ? styles.userText : styles.assistantText,
          ]}>
          {item.content}
        </Text>
      )}
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
        <Text style={styles.headerTitle}>AI Copilot</Text>
        <Text style={styles.headerSubtitle}>
          Ask anything about your business
        </Text>
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

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your business..."
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
            <Text style={styles.sendButtonText}>Send</Text>
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
  typingRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
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
});

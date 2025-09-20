import { useState } from 'react';
import styles from './FAQ.module.css';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "What is zkFileSend?",
    answer: "zkFileSend is an end-to-end encrypted file-transfer system built on the Sui blockchain. Only the sender and receiver can access the file — not even Sui validators can see it."
  },
  {
    question: "Why do we need this?",
    answer: "Traditional file sharing services can access your files. With zkFileSend, your files are encrypted before leaving your device, ensuring true privacy and security."
  },
  {
    question: "How it works?",
    answer: "Files are encrypted using Seal protocol and stored on Walrus decentralized storage. Only authorized users with the correct cryptographic keys can decrypt and access the files."
  },
  {
    question: "What is Sui?",
    answer: "Sui is a layer-1 blockchain that provides fast, secure, and scalable infrastructure for decentralized applications. It enables programmable transactions and object-centric data models."
  },
  {
    question: "What is Walrus and Seal?",
    answer: "Walrus is a decentralized storage protocol for large blob data, while Seal provides threshold encryption capabilities. Together, they enable secure, decentralized file storage and sharing."
  }
];

export function FAQ() {
  const [expandedIndex, setExpandedIndex] = useState<number>(0); // 첫 번째 항목이 기본 확장

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  return (
    <div className={styles.faqContainer}>
      <div className={styles.faqTitle}>FAQs</div>
      <div className={styles.faqList}>
        {faqData.map((item, index) => (
          <div key={index} className={styles.faqItem}>
            <div
              className={styles.faqQuestion}
              onClick={(e) => {
                e.preventDefault();
                toggleExpand(index);
              }}
            >
              <div className={styles.questionText}>{item.question}</div>
              <div className={styles.iconWrapper}>
                {expandedIndex === index ? (
                  // Minus icon (expanded)
                  <div className={styles.minusIcon} />
                ) : (
                  // Plus icon (collapsed)
                  <div className={styles.plusIconContainer}>
                    <div className={styles.plusIconH} />
                    <div className={styles.plusIconV} />
                  </div>
                )}
              </div>
            </div>
            {expandedIndex === index && (
              <div className={styles.faqAnswer}>
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
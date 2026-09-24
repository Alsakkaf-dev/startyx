/** خريطة ترحيل الشاشات. الحساب واسمه يُحلّان في الخادم من الدليل وجداول الربط — لا أرقام ولا أسماء حسابات هنا. */
(function (root) {
  "use strict";

  var PAY = {
    "آجل": "credit",
    "نقد": "cash",
    "مختلط": "credit",
    "تحويل بنكي": "bank",
    "تحويل": "bank",
    "شيك": "cheque",
    "إلى حساب": "to_account"
  };

  var MAP = {
    "op.7.5.3.6": {
      kind: "sales_invoice",
      shape: "items",
      party: "العميل",
      pay: "طريقة الدفع",
      date: "التاريخ",
      cash: "الصندوق",
      headerDiscount: "قيمة خصم الرأس",
      charges: ["الشحن", "أعباء أخرى"],
      tax: true,
      defaultAvg: "40"
    },
    "op.7.5.3.7": {
      kind: "sales_return",
      shape: "items",
      party: "العميل",
      date: "التاريخ",
      tax: true,
      defaultAvg: "40"
    },
    "op.7.1.3.4": {
      kind: "receipt_voucher",
      shape: "voucher",
      party: "العميل",
      pay: "طريقة القبض",
      date: "التاريخ",
      cash: "الصندوق / البنك",
      amount: "المبلغ",
      partyType: "customer"
    },
    "op.6.2.3.8": {
      kind: "purchase_invoice",
      shape: "items",
      party: "المورد",
      pay: "طريقة الدفع",
      date: "التاريخ",
      headerDiscount: "خصم الرأس",
      tax: true,
      purchase: true
    },
    "op.6.2.3.12": {
      kind: "purchase_return",
      shape: "items",
      party: "المورد",
      pay: "طريقة الدفع",
      date: "التاريخ",
      tax: true,
      purchase: true,
      priceCol: "سعر المورد"
    },
    "op.6.1.3.3": {
      kind: "payment_voucher",
      shape: "voucher",
      party: "المورد",
      pay: "طريقة الصرف",
      date: "التاريخ",
      cash: "الصندوق / البنك",
      amount: "المبلغ",
      partyType: "vendor"
    },
    "op.5.1.3.16": {
      kind: "stock_receipt",
      shape: "stock",
      date: "التاريخ",
      headerAcc: "الحساب الدائن",
      qtyCol: "الكمية",
      costCol: "التكلفة"
    },
    "op.5.1.3.4": {
      kind: "stock_issue",
      shape: "stock",
      date: "التاريخ",
      headerAcc: "الحساب المدين",
      qtyCol: "الكمية",
      costCol: "التكلفة"
    },
    "op.5.1.3.5": {
      kind: "stock_transfer",
      shape: "stock",
      date: "التاريخ",
      qtyCol: "الكمية",
      costCol: "التكلفة"
    },
    "op.5.1.3.6": {
      kind: "stock_transfer_receipt",
      shape: "stock",
      date: "التاريخ",
      qtyCol: "المستلم",
      costCol: "التكلفة"
    },
    "op.4.1.3.14": {
      kind: "manual_journal",
      shape: "journal",
      date: "التاريخ",
      accCol: "الحساب",
      partyCol: "التحليلي",
      drCol: "مدين",
      crCol: "دائن"
    }
  };

  root.StartyxPostMap = { MAP: MAP, PAY: PAY };
})(window);

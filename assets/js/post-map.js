/** خريطة ترحيل الشاشات — مرحلة ح. الحساب يبقى في الخادم. */
(function (root) {
  "use strict";

  var NAMES = {
    "1203010001": "عملاء المبيعات الآجلة",
    "4101010001": "مبيعات زيوت التشحيم",
    "2202070001": "ضريبة القيمة المضافة المستحقة",
    "1204010001": "ضريبة مدخلات",
    "3101010001": "تكلفة المبيعات",
    "1202010001": "المخزون السلعي للبضائع",
    "1201010001": "الصندوق الرئيسي",
    "1201010002": "صندوق المناديب",
    "1201020005": "شيكات تحت التحصيل",
    "4101020001": "مردود المبيعات",
    "3101040001": "تكلفة مردود المبيعات",
    "3101020001": "مردود سنوات سابقة",
    "3101050001": "تكلفة الكميات المجانية",
    "3101050002": "تكلفة مردود المجاني",
    "1202010010": "وسيط التحويل المخزني",
    "2101010001": "موردون",
    "3101060001": "فروق التكلفة",
    "2202020001": "موردون محليون",
    "1207030001": "ضريبة مدخلات",
    "1202010009": "مخزن تحت التشغيل",
    "1201020001": "مصرف الراجحي"
  };

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
    "op.7.1.2.10": {
      kind: "opening_balance",
      shape: "opening",
      dateCol: "تاريخ الاعتماد",
      partyType: "customer",
      accCol: "رقم الحساب",
      partyCol: "الحساب التحليلي",
      drCol: "مدين",
      crCol: "دائن"
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
    "op.6.1.2.4": {
      kind: "opening_balance",
      shape: "opening",
      partyType: "vendor",
      accCol: "رقم الحساب",
      partyCol: "المورد",
      drCol: "مدين",
      crCol: "دائن"
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

  root.StartyxPostMap = { MAP: MAP, PAY: PAY, NAMES: NAMES };
})(window);

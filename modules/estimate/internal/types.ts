export interface LineItemRecord {
  lineItemId: number;
  assessmentId: string;
  description: string;
  partCost: string;
  laborHours: string;
  laborRate: string;
}

export interface EstimateResult {
  lineItems: LineItemRecord[];
  total: string;
  possibleTotalLoss: boolean;
}

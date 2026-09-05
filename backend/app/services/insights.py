from __future__ import annotations

import calendar
from collections import defaultdict
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Sequence

from app.schemas.expense import (
    ExpenseCategory,
    ExpenseResponse,
    InsightItem,
    InsightsResponse,
)

NEEDS_CATEGORIES = {ExpenseCategory.FOOD, ExpenseCategory.BILLS, ExpenseCategory.HEALTH, ExpenseCategory.TRANSPORT}
WANTS_CATEGORIES = {ExpenseCategory.ENTERTAINMENT, ExpenseCategory.SHOPPING, ExpenseCategory.OTHER}


class InsightsService:
    """Intelligent financial insights and recommendation engine."""

    def analyze(
        self,
        expenses: Sequence[ExpenseResponse | dict],
        monthly_budget: Decimal = Decimal("50000.00"),
    ) -> InsightsResponse:
        now = datetime.now(UTC)
        today = now.date()
        year = today.year
        month = today.month

        # Month day calculations
        _, total_days_in_month = calendar.monthrange(year, month)
        days_passed = max(1, today.day)
        remaining_days = max(1, total_days_in_month - today.day + 1)

        # Normalize expenses into list of dicts
        normalized: list[dict] = []
        for exp in expenses:
            if isinstance(exp, dict):
                normalized.append({
                    "id": str(exp.get("id", "")),
                    "amount": Decimal(str(exp.get("amount", "0"))),
                    "description": str(exp.get("description", "")),
                    "category": ExpenseCategory(exp.get("category", "other")),
                    "date": exp.get("date") if isinstance(exp.get("date"), date) else datetime.fromisoformat(str(exp.get("date"))).date(),
                })
            else:
                normalized.append({
                    "id": str(exp.id),
                    "amount": Decimal(str(exp.amount)),
                    "description": exp.description,
                    "category": exp.category,
                    "date": exp.date,
                })

        # Filter current month expenses
        current_month_expenses = [
            e for e in normalized
            if e["date"].year == year and e["date"].month == month
        ]

        # In case current month has few/no expenses, use all available
        active_expenses = current_month_expenses if current_month_expenses else normalized

        total_spent = sum((e["amount"] for e in active_expenses), Decimal("0"))
        remaining_budget = max(Decimal("0"), monthly_budget - total_spent)
        safe_daily_spend = (remaining_budget / Decimal(str(remaining_days))).quantize(Decimal("0.01"))

        # Spending velocity and month-end projection
        daily_velocity = total_spent / Decimal(str(days_passed))
        projected_month_end = (total_spent + (daily_velocity * Decimal(str(remaining_days - 1)))).quantize(Decimal("0.01"))

        # Burn rate status
        if projected_month_end > monthly_budget * Decimal("1.25"):
            burn_rate_status = "critical"
        elif projected_month_end > monthly_budget:
            burn_rate_status = "high_velocity"
        elif projected_month_end <= monthly_budget * Decimal("0.8"):
            burn_rate_status = "under_budget"
        else:
            burn_rate_status = "optimal"

        # 50/30/20 Rule Breakdown
        needs_total = sum((e["amount"] for e in active_expenses if e["category"] in NEEDS_CATEGORIES), Decimal("0"))
        wants_total = sum((e["amount"] for e in active_expenses if e["category"] in WANTS_CATEGORIES), Decimal("0"))

        if total_spent > Decimal("0"):
            needs_percent = int(round(float(needs_total / total_spent) * 100))
            wants_percent = int(round(float(wants_total / total_spent) * 100))
        else:
            needs_percent = 0
            wants_percent = 0

        savings_buffer_percent = max(0, 100 - needs_percent - wants_percent)

        # Generate smart recommendations
        recommendations: list[InsightItem] = []

        # 1. Safe Daily Limit Insight
        if remaining_budget > 0:
            recommendations.append(
                InsightItem(
                    id="safe-daily-limit",
                    type="projection",
                    title="🎯 Safe Daily Spending Target",
                    description=f"Spending ₹{safe_daily_spend} or less per day over the remaining {remaining_days} days will keep you safely within your monthly budget of ₹{monthly_budget}.",
                    metric=f"₹{safe_daily_spend} / day",
                    action_label="Target Cap",
                    action_type="safe_limit",
                )
            )

        # 2. Pacing / Overspending Warning
        if burn_rate_status in ["critical", "high_velocity"]:
            over_amount = projected_month_end - monthly_budget
            recommendations.append(
                InsightItem(
                    id="pacing-warning",
                    type="warning",
                    title="🚨 Budget Overrun Projected",
                    description=f"At your current daily pace of ₹{daily_velocity.quantize(Decimal('0.01'))}/day, month-end spend is projected at ₹{projected_month_end} (₹{over_amount} over budget).",
                    metric=f"+₹{over_amount} Over",
                    action_label="Review Expenses",
                    action_type="jump_history",
                )
            )
        elif burn_rate_status == "under_budget" and total_spent > 0:
            surplus = monthly_budget - projected_month_end
            recommendations.append(
                InsightItem(
                    id="healthy-surplus",
                    type="positive",
                    title="🏆 Excellent Budget Discipline",
                    description=f"You are pacing below budget! If current trends hold, you will finish the month with an estimated ₹{surplus} surplus to put into savings or investments.",
                    metric=f"₹{surplus} Projected Savings",
                    action_label="View Analytics",
                    action_type="jump_stats",
                )
            )

        # 3. Category Heavy Concentration
        cat_totals: dict[ExpenseCategory, Decimal] = defaultdict(Decimal)
        for e in active_expenses:
            cat_totals[e["category"]] += e["amount"]

        if cat_totals:
            top_category = max(cat_totals.items(), key=lambda item: item[1])
            if top_category[1] > total_spent * Decimal("0.35") and total_spent > Decimal("0"):
                top_cat_pct = int(round(float(top_category[1] / total_spent) * 100))
                recommendations.append(
                    InsightItem(
                        id=f"top-cat-{top_category[0].value}",
                        type="opportunity",
                        title=f"💡 High Concentration in {top_category[0].value.capitalize()}",
                        description=f"{top_category[0].value.capitalize()} represents {top_cat_pct}% (₹{top_category[1]}) of your total spending. Reducing discretionary purchases here by 10% would save ₹{(top_category[1] * Decimal('0.10')).quantize(Decimal('0.01'))}.",
                        category=top_category[0],
                        metric=f"{top_cat_pct}% of Total",
                        action_label=f"Filter {top_category[0].value.capitalize()}",
                        action_type=f"filter_{top_category[0].value}",
                    )
                )

        # 4. Wants / Discretionary Spending Optimizer (50/30/20 Rule)
        if wants_percent > 35:
            discretionary_savings = (wants_total * Decimal("0.15")).quantize(Decimal("0.01"))
            recommendations.append(
                InsightItem(
                    id="wants-trim",
                    type="opportunity",
                    title="💡 50/30/20 Discretionary Optimizer",
                    description=f"Wants (Entertainment, Shopping & Other) are currently taking {wants_percent}% of your outlays (ideal is ≤30%). Trimming non-essentials by 15% will unlock ₹{discretionary_savings} in savings.",
                    metric=f"Save ₹{discretionary_savings}/mo",
                    action_label="Analyze Wants",
                    action_type="jump_kpis",
                )
            )

        # 5. Outlier / High-Value Transaction Spotter
        if active_expenses:
            highest_exp = max(active_expenses, key=lambda e: e["amount"])
            if highest_exp["amount"] > total_spent * Decimal("0.25") and total_spent > Decimal("1000"):
                high_pct = int(round(float(highest_exp["amount"] / total_spent) * 100))
                recommendations.append(
                    InsightItem(
                        id=f"outlier-{highest_exp['id']}",
                        type="warning",
                        title="🔍 Outlier Transaction Detected",
                        description=f"'{highest_exp['description']}' (₹{highest_exp['amount']}) accounts for {high_pct}% of your spending this month.",
                        category=highest_exp["category"],
                        metric=f"₹{highest_exp['amount']}",
                        action_label="Inspect Item",
                        action_type="jump_history",
                    )
                )

        # 6. Recurring Subscriptions / Bill Spotter
        desc_counts: dict[str, list[dict]] = defaultdict(list)
        for e in normalized:
            desc_counts[e["description"].strip().lower()].append(e)

        recurring = [items for items in desc_counts.values() if len(items) >= 2]
        if recurring:
            rec_count = len(recurring)
            rec_monthly_total = sum((items[0]["amount"] for items in recurring), Decimal("0"))
            recommendations.append(
                InsightItem(
                    id="recurring-subscriptions",
                    type="recurring",
                    title="🔄 Recurring Commitments Spotter",
                    description=f"Identified {rec_count} repeating payments (e.g., '{recurring[0][0]['description']}'). They total ~₹{rec_monthly_total}/month.",
                    metric=f"{rec_count} Subscriptions",
                    action_label="Manage Bills",
                    action_type="filter_bills",
                )
            )

        return InsightsResponse(
            safe_daily_spend=safe_daily_spend,
            projected_month_end_spend=projected_month_end,
            remaining_days=remaining_days,
            remaining_budget=remaining_budget,
            monthly_budget=monthly_budget,
            burn_rate_status=burn_rate_status,
            needs_percent=needs_percent,
            wants_percent=wants_percent,
            savings_buffer_percent=savings_buffer_percent,
            recommendations=recommendations,
        )


insights_service = InsightsService()

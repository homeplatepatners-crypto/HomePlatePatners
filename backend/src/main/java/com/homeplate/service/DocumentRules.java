package com.homeplate.service;

import com.homeplate.entity.Kitchen;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** Identity / FSSAI document rules for kitchen onboarding (kept in sync with KitchenForm.tsx ID_TYPES). */
public final class DocumentRules {
    private DocumentRules() {}

    private record IdRule(Pattern pattern, String format, boolean backSide) {}

    private static final Map<String, IdRule> ID_RULES = Map.of(
            "Aadhaar", new IdRule(Pattern.compile("^[2-9]\\d{11}$"), "12 digits", true),
            "PAN", new IdRule(Pattern.compile("^[A-Z]{5}\\d{4}[A-Z]$"), "e.g. ABCDE1234F", false),
            "Voter ID", new IdRule(Pattern.compile("^[A-Z]{3}\\d{7}$"), "e.g. ABC1234567", true),
            "Driving Licence", new IdRule(Pattern.compile("^[A-Z]{2}\\d{2}\\d{11}$"), "e.g. TN0120190001234", true),
            "Passport", new IdRule(Pattern.compile("^[A-Z]\\d{7}$"), "e.g. A1234567", false));

    /** Removes spaces / hyphens and upper-cases the ID number. */
    public static String normalise(String idNumber) {
        return idNumber == null ? "" : idNumber.replaceAll("[\\s-]", "").toUpperCase();
    }

    public static boolean needsBackSide(String idType) {
        IdRule r = ID_RULES.get(idType);
        return r != null && r.backSide();
    }

    public static boolean fssaiRequired(String fssaiType) {
        return fssaiType != null && !fssaiType.startsWith("Applied");
    }

    /** Problems with the identity / food-safety documents; empty when everything is fine. */
    public static List<String> problems(Kitchen k) {
        List<String> out = new ArrayList<>();
        IdRule r = ID_RULES.get(k.getIdProofType());
        if (r == null) out.add("ID proof type");
        else {
            String n = normalise(k.getIdProofNumber());
            if (!r.pattern().matcher(n).matches()) out.add(k.getIdProofType() + " number (" + r.format() + ")");
        }
        if (blank(k.getIdProofUrl())) out.add("identity document (front)");
        if (needsBackSide(k.getIdProofType()) && blank(k.getIdProofBackUrl())) out.add("identity document (back side)");
        if (fssaiRequired(k.getFssaiType())) {
            if (!normalise(k.getFssaiNumber()).matches("^[12]\\d{13}$")) out.add("FSSAI number (14 digits)");
            if (blank(k.getFssaiCertificateUrl())) out.add("FSSAI certificate");
        }
        return out;
    }

    private static boolean blank(String s) { return s == null || s.isBlank(); }
}

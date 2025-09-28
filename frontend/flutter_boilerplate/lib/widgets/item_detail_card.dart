import 'package:flutter/material.dart';

/// Shared card layout for menu, cart, and order items.
///
/// The widget keeps spacing, padding, and typography consistent while letting
/// callers plug in custom pieces for the leading widget, title/description,
/// trailing column, and metadata sections.
class ItemDetailCard extends StatelessWidget {
  const ItemDetailCard({
    super.key,
    required this.title,
    this.leading,
    this.subtitle,
    this.description,
    this.trailing,
    this.additionalContent = const <Widget>[],
    this.metadata = const <Widget>[],
    this.margin = EdgeInsets.zero,
    this.padding = const EdgeInsets.all(16),
    this.elevation = 1,
    this.backgroundColor,
  });

  final Widget? leading;
  final Widget title;
  final Widget? subtitle;
  final Widget? description;
  final Widget? trailing;
  final List<Widget> additionalContent;
  final List<Widget> metadata;
  final EdgeInsetsGeometry margin;
  final EdgeInsetsGeometry padding;
  final double elevation;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final contentColumnChildren = <Widget>[title];

    if (subtitle != null) {
      contentColumnChildren.add(const SizedBox(height: 4));
      contentColumnChildren.add(subtitle!);
    }

    if (description != null) {
      contentColumnChildren.add(const SizedBox(height: 8));
      contentColumnChildren.add(description!);
    }

    if (additionalContent.isNotEmpty) {
      contentColumnChildren.addAll(additionalContent);
    }

    final cardChildren = <Widget>[
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (leading != null) ...[
            leading!,
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: contentColumnChildren,
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 12),
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                trailing!,
              ],
            ),
          ],
        ],
      ),
      if (metadata.isNotEmpty) ...metadata,
    ];

    return Card(
      margin: margin,
      elevation: elevation,
      color: backgroundColor ?? theme.cardColor,
      child: Padding(
        padding: padding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: cardChildren,
        ),
      ),
    );
  }
}

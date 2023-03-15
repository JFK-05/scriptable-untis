import { CURRENT_DATETIME, SCRIPT_START_DATETIME } from '@/constants'
import { FetchedData, fetchDataForViews } from './api/fetchManager'
import { View } from './layout'
import { colors } from './preferences/colors'
import { Config, Options } from './preferences/config'
import { addSymbol } from './utils/componentHelper'
import { getCharHeight } from './utils/helper'
import { getWidgetSize, getWidgetSizes } from './utils/widgetSize'
import { addViewAbsences } from './views/absences'
import { addViewExams } from './views/exams'
import { addViewGrades } from './views/grades'
import { addViewLessons } from './views/lessons'
import { addViewPreview } from './views/preview'

export interface ViewBuildData {
	container: WidgetStack
	width: number
	height: number
}

export function checkNewRefreshDate(newDate: Date, fetchedData: FetchedData) {
	if (!fetchedData.refreshDate || newDate < fetchedData.refreshDate) {
		fetchedData.refreshDate = newDate
		return
	}
}

export function proposeRefreshInXHours(hours: number, fetchedData: FetchedData) {
	const newDate = new Date(CURRENT_DATETIME)
	newDate.setHours(newDate.getHours() + hours)
	checkNewRefreshDate(newDate, fetchedData)
}

/**
 * Creates the widget by adding as many views to it as fit.
 * Also adds the footer.
 */
export async function createWidget(user: FullUser, layout: View[][], options: Options) {
	const widget = new ListWidget()

	const widgetSizes = getWidgetSizes()

	const paddingHorizontal = Math.max(options.appearance.padding, 4)
	const paddingVertical = Math.max(options.appearance.padding, 6)

	const widgetSize = getWidgetSize(widgetSizes, config.widgetFamily)
	const contentSize = new Size(widgetSize.width - paddingHorizontal * 2, widgetSize.height - paddingVertical * 2)

	widget.setPadding(paddingHorizontal, paddingVertical, paddingHorizontal, paddingVertical)
	widget.backgroundColor = Color.black()

	const widgetContent = widget.addStack()
	widgetContent.layoutHorizontally()
	// widgetContent.layoutVertically()
	widgetContent.topAlignContent()
	widgetContent.spacing = options.appearance.spacing

	// make a list of the shown views
	const shownViews = new Set<View>()
	for (const row of layout) {
		for (const view of row) {
			shownViews.add(view)
		}
	}

	// fetch the data for the shown views
	const fetchedData = await fetchDataForViews(Array.from(shownViews), user, options)

	if (fetchedData.refreshDate) {
		console.log(`Refresh date: ${fetchedData.refreshDate}`)
		widget.refreshAfterDate = fetchedData.refreshDate
	}

	// TODO: flexible layout when only one column
	const columnWidth = contentSize.width / layout.length

	// add all the columns with the views
	for (const column of layout) {
		// add the column
		const columnStack = widgetContent.addStack()
		columnStack.layoutVertically()
		columnStack.topAlignContent()
		columnStack.spacing = options.appearance.spacing

		// calculate the real available height
		let availableContentHeight = contentSize.height
		if (options.footer.show) availableContentHeight -= getFooterHeight(options)

		columnStack.size = new Size(columnWidth, availableContentHeight)

		let remainingHeight = availableContentHeight

		console.log(`Column has ${availableContentHeight} available height`)

		for (const view of column) {
			// exit if there is not enough space left
			if (remainingHeight <= getCharHeight(options.appearance.fontSize)) continue

			const viewData: ViewBuildData = {
				container: columnStack,
				width: columnWidth,
				height: remainingHeight,
			}

			let viewHeight = 0

			switch (view) {
				case View.LESSONS:
					if (!fetchedData.lessonsTodayRemaining || !fetchedData.lessonsNextDay || !fetchedData.nextDayKey) {
						console.warn(`Tried to add lessons view, but no lessons data was fetched`)
						continue
					}
					// show a preview if there are no lessons today anymore
					if (fetchedData.lessonsTodayRemaining.length > 0) {
						viewHeight = addViewLessons(
							fetchedData.lessonsTodayRemaining,
							options.views.lessons.maxCount,
							viewData,
							options
						)
					} else {
						viewHeight = addViewPreview(
							fetchedData.lessonsNextDay,
							fetchedData.nextDayKey,
							viewData,
							options
						)
					}
					break
				case View.PREVIEW:
					if (!fetchedData.lessonsNextDay || !fetchedData.nextDayKey) {
						console.warn(`Tried to add preview view, but no lessons data was fetched`)
						continue
					}
					// only show the day preview, if it is not already shown
					if (shownViews.has(View.LESSONS) && fetchedData.lessonsTodayRemaining?.length === 0) break

					viewHeight = addViewPreview(fetchedData.lessonsNextDay, fetchedData.nextDayKey, viewData, options)
					break
				case View.EXAMS:
					if (!fetchedData.exams) {
						console.warn(`Tried to add exams view, but no exams data was fetched`)
						continue
					}
					viewHeight = addViewExams(fetchedData.exams, options.views.exams.maxCount, viewData, options)
					break
				case View.GRADES:
					if (!fetchedData.grades) {
						console.warn(`Tried to add grades view, but no grades data was fetched`)
						continue
					}
					viewHeight = addViewGrades(fetchedData.grades, options.views.grades.maxCount, viewData, options)
					break
				case View.ABSENCES:
					if (!fetchedData.absences) {
						console.warn(`Tried to add absences view, but no absences data was fetched`)
						continue
					}
					viewHeight = addViewAbsences(
						fetchedData.absences,
						options.views.absences.maxCount,
						viewData,
						options
					)
					break
			}

			// add the spacing if necessary (view added and enough space left)
			if (viewHeight > 0 && remainingHeight > options.appearance.spacing) {
				remainingHeight -= options.appearance.spacing
			}

			remainingHeight -= viewHeight

			console.log(`Added view ${view} with height ${viewHeight}, remaining height: ${remainingHeight}`)
		}

		if (remainingHeight > options.appearance.spacing) {
			// add spacer to fill the remaining space
			let space = remainingHeight - options.appearance.spacing
			if (space < 0) space = 0
			columnStack.addSpacer(space)
		}
	}

	if (options.footer.show) {
		addFooter(widget, contentSize.width, options)
	}

	return widget
}

function getFooterHeight(config: Config) {
	return getCharHeight(10) + 2 * 4
}

function addFooter(container: WidgetStack | ListWidget, width: number, config: Config) {
	const footerGroup = container.addStack()

	footerGroup.layoutHorizontally()
	footerGroup.spacing = 4
	footerGroup.bottomAlignContent()
	footerGroup.centerAlignContent()
	// avoid overflow when pushed to the bottom
	footerGroup.setPadding(4, 6, 4, 6)
	footerGroup.size = new Size(width, getFooterHeight(config))

	// TODO: remove
	const usingOldCache = false

	addSymbol('arrow.clockwise', footerGroup, {
		color: usingOldCache ? colors.text.red : colors.text.secondary,
		size: 10,
		outerSize: 10,
	})

	// show the time of the last update (now) as HH:MM with leading zeros
	const updateDateTime = footerGroup.addText(
		`${new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`
	)
	updateDateTime.textColor = usingOldCache ? colors.text.red : colors.text.secondary
	updateDateTime.font = Font.regularSystemFont(10)

	if (usingOldCache) {
		const updateInfo = footerGroup.addText(' (cache)')
		updateInfo.textColor = colors.text.red
		updateInfo.font = Font.regularSystemFont(10)
	}

	footerGroup.addSpacer()

	// TODO: make more exact
	const executionDuration = `${new Date().getTime() - SCRIPT_START_DATETIME.getTime()}ms`
	const executionDurationText = footerGroup.addText(executionDuration)
	executionDurationText.textColor = colors.text.secondary
	executionDurationText.font = Font.regularSystemFont(10)
}

+++
title = '{{- replace .File.ContentBaseName "_" " " | title -}}'
summary = ""
categories = []
tags = []
series = []

lastmod = "{{- .Date -}}"
draft = true

date = "{{- .Date -}}"
archives = '{{- (time.AsTime .Date) | time.Format "2006-01" -}}'
isCJKLanguage = {{ eq .Page.Language.Lang "zh-cn"}}
weight = 5
+++
